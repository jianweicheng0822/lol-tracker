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

@Service
public class LeaderboardService {

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;

    public LeaderboardService(RiotApiService riotApiService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
    }

    public List<LeaderboardEntryDto> getLeaderboard(String tier, String queue, RiotRegion region) {
        String json = riotApiService.getLeagueByTier(tier, queue, region);
        try {
            JsonNode root = objectMapper.readTree(json);
            String leagueTier = root.path("tier").asText(tier.toUpperCase());
            JsonNode entries = root.path("entries");

            List<LeaderboardEntryDto> result = new ArrayList<>();
            for (JsonNode e : entries) {
                String name = e.path("summonerName").asText("Unknown");
                String rank = e.path("rank").asText("I");
                int lp = e.path("leaguePoints").asInt(0);
                int wins = e.path("wins").asInt(0);
                int losses = e.path("losses").asInt(0);
                int total = wins + losses;
                double winRate = total > 0 ? Math.round((double) wins / total * 1000.0) / 10.0 : 0.0;

                result.add(new LeaderboardEntryDto(name, leagueTier, rank, lp, wins, losses, winRate));
            }

            result.sort(Comparator.comparingInt(LeaderboardEntryDto::leaguePoints).reversed());
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse league JSON for " + tier, e);
        }
    }
}
