package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.LiveGameDto;
import com.jw.backend.dto.LiveGameParticipantDto;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class LiveGameService {

    private static final Logger log = LoggerFactory.getLogger(LiveGameService.class);

    private final RiotApiService riotApiService;
    private final RankedService rankedService;
    private final ObjectMapper objectMapper;
    private final Executor executor = Executors.newFixedThreadPool(6);

    public LiveGameService(RiotApiService riotApiService, RankedService rankedService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.rankedService = rankedService;
        this.objectMapper = objectMapper;
    }

    public Optional<LiveGameDto> getActiveGame(String puuid, RiotRegion region) {
        String spectatorJson = riotApiService.getActiveGame(puuid, region);
        if (spectatorJson == null) {
            return Optional.empty();
        }

        try {
            JsonNode root = objectMapper.readTree(spectatorJson);
            long gameId = root.path("gameId").asLong(0);
            String gameMode = root.path("gameMode").asText("CLASSIC");
            int queueId = root.path("gameQueueConfigId").asInt(0);
            long gameStartTime = root.path("gameStartTime").asLong(0);
            long gameLength = root.path("gameLength").asLong(0);

            JsonNode participantsNode = root.path("participants");
            List<JsonNode> participantList = new ArrayList<>();
            for (JsonNode p : participantsNode) {
                participantList.add(p);
            }

            List<CompletableFuture<LiveGameParticipantDto>> futures = participantList.stream()
                    .map(p -> CompletableFuture.supplyAsync(() -> resolveParticipant(p, region), executor)
                            .exceptionally(ex -> {
                                log.warn("Failed to resolve participant: {}", ex.getMessage());
                                return buildFallbackParticipant(p);
                            }))
                    .toList();

            List<LiveGameParticipantDto> participants = futures.stream()
                    .map(CompletableFuture::join)
                    .toList();

            return Optional.of(new LiveGameDto(gameId, gameMode, queueId, gameStartTime, gameLength, participants));
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse active game JSON", e);
        }
    }

    private LiveGameParticipantDto resolveParticipant(JsonNode p, RiotRegion region) {
        String puuid = p.path("puuid").asText("");
        int championId = p.path("championId").asInt(0);
        int teamId = p.path("teamId").asInt(0);
        int spell1Id = p.path("spell1Id").asInt(0);
        int spell2Id = p.path("spell2Id").asInt(0);

        // Resolve account name
        String gameName = "Unknown";
        String tagLine = "";
        try {
            String accountJson = riotApiService.getAccountByPuuid(puuid, region);
            JsonNode accountNode = objectMapper.readTree(accountJson);
            gameName = accountNode.path("gameName").asText("Unknown");
            tagLine = accountNode.path("tagLine").asText("");
        } catch (Exception e) {
            log.warn("Failed to resolve account for puuid {}: {}", puuid, e.getMessage());
        }

        // Resolve ranked data
        String tier = null;
        String rank = null;
        int leaguePoints = 0;
        int wins = 0;
        int losses = 0;
        double winRate = 0;
        try {
            List<RankedEntryDto> entries = rankedService.getRankedInfo(puuid, region);
            Optional<RankedEntryDto> soloEntry = entries.stream()
                    .filter(e -> "RANKED_SOLO_5x5".equals(e.queueType()))
                    .findFirst();
            if (soloEntry.isPresent()) {
                RankedEntryDto e = soloEntry.get();
                tier = e.tier();
                rank = e.rank();
                leaguePoints = e.leaguePoints();
                wins = e.wins();
                losses = e.losses();
                int total = wins + losses;
                winRate = total > 0 ? Math.round((double) wins / total * 1000.0) / 10.0 : 0;
            }
        } catch (Exception e) {
            log.warn("Failed to resolve ranked for puuid {}: {}", puuid, e.getMessage());
        }

        return new LiveGameParticipantDto(puuid, gameName, tagLine, championId, teamId, spell1Id, spell2Id,
                tier, rank, leaguePoints, wins, losses, winRate);
    }

    private LiveGameParticipantDto buildFallbackParticipant(JsonNode p) {
        return new LiveGameParticipantDto(
                p.path("puuid").asText(""),
                "Unknown", "",
                p.path("championId").asInt(0),
                p.path("teamId").asInt(0),
                p.path("spell1Id").asInt(0),
                p.path("spell2Id").asInt(0),
                null, null, 0, 0, 0, 0
        );
    }
}
