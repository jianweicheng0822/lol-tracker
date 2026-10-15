package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.ChampionMasteryDto;
import com.jw.backend.dto.MultiSearchPlayerDto;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class MultiSearchService {

    private static final Logger log = LoggerFactory.getLogger(MultiSearchService.class);

    /** How many "main" champions to show per player. */
    static final int TOP_CHAMPION_COUNT = 3;

    private final RiotApiService riotApiService;
    private final RankedService rankedService;
    private final ObjectMapper objectMapper;
    private final Executor executor = Executors.newFixedThreadPool(6);

    public MultiSearchService(RiotApiService riotApiService, RankedService rankedService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.rankedService = rankedService;
        this.objectMapper = objectMapper;
    }

    public List<MultiSearchPlayerDto> lookup(List<String[]> nameTagPairs, RiotRegion region) {
        List<CompletableFuture<MultiSearchPlayerDto>> futures = nameTagPairs.stream()
                .map(pair -> CompletableFuture.supplyAsync(() -> lookupSingle(pair[0], pair[1], region), executor)
                        .exceptionally(ex -> {
                            log.warn("Multi-search lookup failed for {}#{}: {}", pair[0], pair[1], ex.getMessage());
                            return new MultiSearchPlayerDto(pair[0], pair[1], null, 0, List.of(), List.of(), "Player not found");
                        }))
                .toList();

        return futures.stream().map(CompletableFuture::join).toList();
    }

    private MultiSearchPlayerDto lookupSingle(String gameName, String tagLine, RiotRegion region) {
        try {
            String accountJson = riotApiService.getAccountByRiotId(gameName, tagLine, region);
            JsonNode accountNode = objectMapper.readTree(accountJson);
            String puuid = accountNode.path("puuid").asText();
            String resolvedName = accountNode.path("gameName").asText(gameName);
            String resolvedTag = accountNode.path("tagLine").asText(tagLine);

            String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
            JsonNode summonerNode = objectMapper.readTree(summonerJson);
            int profileIconId = summonerNode.path("profileIconId").asInt(0);

            List<RankedEntryDto> rankedEntries = rankedService.getRankedInfo(puuid, region);
            List<ChampionMasteryDto> topChampions = topChampions(puuid, region);

            return new MultiSearchPlayerDto(resolvedName, resolvedTag, puuid, profileIconId, rankedEntries, topChampions, null);
        } catch (Exception e) {
            return new MultiSearchPlayerDto(gameName, tagLine, null, 0, List.of(), List.of(), "Player not found");
        }
    }

    /** A player's mains are a nice-to-have: if the lookup fails, the card still shows their rank. */
    List<ChampionMasteryDto> topChampions(String puuid, RiotRegion region) {
        try {
            JsonNode arr = objectMapper.readTree(riotApiService.getTopChampionMasteries(puuid, region, TOP_CHAMPION_COUNT));
            List<ChampionMasteryDto> result = new ArrayList<>();
            for (JsonNode n : arr) {
                result.add(new ChampionMasteryDto(
                        n.path("championId").asInt(),
                        n.path("championLevel").asInt(),
                        n.path("championPoints").asLong()));
            }
            return result;
        } catch (Exception e) {
            log.debug("Champion mastery lookup failed for {}: {}", puuid, e.getMessage());
            return List.of();
        }
    }
}
