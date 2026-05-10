/**
 * @file RankedService.java
 * @description Service for fetching and parsing ranked league data from the Riot API.
 * @module backend.service
 */
package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Parse raw Riot League-v4 JSON into structured ranked entry DTOs.
 */
@Service
public class RankedService {

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper;

    /**
     * Construct the service with required dependencies.
     *
     * @param riotApiService service for Riot API communication
     * @param objectMapper   Jackson mapper for JSON parsing
     */
    public RankedService(RiotApiService riotApiService, ObjectMapper objectMapper) {
        this.riotApiService = riotApiService;
        this.objectMapper = objectMapper;
    }

    /**
     * Retrieve ranked entries for a player across all queues.
     *
     * @param puuid  the player's unique identifier
     * @param region the Riot platform region
     * @return list of ranked entries with tier, rank, LP, and win/loss data
     * @throws RuntimeException if the Riot API response cannot be parsed
     */
    public List<RankedEntryDto> getRankedInfo(String puuid, RiotRegion region) {
        String rankedJson = riotApiService.getRankedEntriesByPuuid(puuid, region);
        try {
            JsonNode arr = objectMapper.readTree(rankedJson);
            List<RankedEntryDto> entries = new ArrayList<>();
            for (JsonNode entry : arr) {
                entries.add(new RankedEntryDto(
                        entry.path("queueType").asText(),
                        entry.path("tier").asText(),
                        entry.path("rank").asText(),
                        entry.path("leaguePoints").asInt(),
                        entry.path("wins").asInt(),
                        entry.path("losses").asInt()
                ));
            }
            return entries;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse ranked entries JSON", e);
        }
    }
}
