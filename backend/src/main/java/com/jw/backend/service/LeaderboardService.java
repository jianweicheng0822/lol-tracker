/**
 * @file LeaderboardService.java
 * @description Business logic for parsing and sorting League-v4 leaderboard data.
 * @module backend.service
 */
package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LeaderboardEntryDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class LeaderboardService {

    private static final Logger log = LoggerFactory.getLogger(LeaderboardService.class);
    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;
    private final Executor nameResolver = Executors.newFixedThreadPool(8);

    public LeaderboardService(RiotApiService riotApiService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
    }

    public record LeaderboardPage(List<LeaderboardEntryDto> entries, int totalEntries) {}

    public LeaderboardPage getLeaderboard(String tier, String queue, RiotRegion region, int page, int size) {
        String json = riotApiService.getLeagueByTier(tier, queue, region);
        try {
            JsonNode root = objectMapper.readTree(json);
            String leagueTier = root.path("tier").asText(tier.toUpperCase());
            JsonNode entries = root.path("entries");

            List<RawEntry> rawEntries = new ArrayList<>();
            for (JsonNode e : entries) {
                String puuid = e.path("puuid").asText("");
                String fallbackName = e.path("summonerName").asText("");
                String rank = e.path("rank").asText("I");
                int lp = e.path("leaguePoints").asInt(0);
                int wins = e.path("wins").asInt(0);
                int losses = e.path("losses").asInt(0);
                rawEntries.add(new RawEntry(puuid, fallbackName, rank, lp, wins, losses));
            }

            // Sort by LP descending
            rawEntries.sort(Comparator.comparingInt(RawEntry::lp).reversed());

            int totalEntries = rawEntries.size();

            // Paginate: only resolve names for the current page
            int from = Math.min(page * size, totalEntries);
            int to = Math.min(from + size, totalEntries);
            List<RawEntry> pageEntries = rawEntries.subList(from, to);

            // Resolve Riot IDs in parallel via Account-v1 (cached 24h per puuid)
            List<CompletableFuture<LeaderboardEntryDto>> futures = pageEntries.stream()
                    .map(raw -> CompletableFuture.supplyAsync(() -> {
                        String name = resolveName(raw.puuid(), raw.fallbackName(), region);
                        int total = raw.wins() + raw.losses();
                        double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
                        return new LeaderboardEntryDto(name, leagueTier, raw.rank(), raw.lp(), raw.wins(), raw.losses(), winRate);
                    }, nameResolver).orTimeout(10, TimeUnit.SECONDS).exceptionally(ex -> {
                        String name = raw.fallbackName().isEmpty() ? "Unknown" : raw.fallbackName();
                        int total = raw.wins() + raw.losses();
                        double winRate = total > 0 ? Math.round((double) raw.wins() / total * 1000.0) / 10.0 : 0.0;
                        return new LeaderboardEntryDto(name, leagueTier, raw.rank(), raw.lp(), raw.wins(), raw.losses(), winRate);
                    }))
                    .toList();

            List<LeaderboardEntryDto> resolved = futures.stream().map(CompletableFuture::join).toList();
            return new LeaderboardPage(resolved, totalEntries);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse league JSON for " + tier, e);
        }
    }

    private String resolveName(String puuid, String fallbackName, RiotRegion region) {
        if (puuid.isEmpty()) {
            return fallbackName.isEmpty() ? "Unknown" : fallbackName;
        }
        try {
            String accountJson = riotApiService.getAccountByPuuid(puuid, region);
            JsonNode account = objectMapper.readTree(accountJson);
            String gameName = account.path("gameName").asText("");
            String tagLine = account.path("tagLine").asText("");
            if (!gameName.isEmpty()) {
                return tagLine.isEmpty() ? gameName : gameName + "#" + tagLine;
            }
        } catch (Exception e) {
            log.debug("Failed to resolve name for puuid {}: {}", puuid, e.getMessage());
        }
        return fallbackName.isEmpty() ? "Unknown" : fallbackName;
    }

    private record RawEntry(String puuid, String fallbackName, String rank, int lp, int wins, int losses) {}
}
