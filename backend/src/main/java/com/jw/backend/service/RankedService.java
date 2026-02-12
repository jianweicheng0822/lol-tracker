package com.jw.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RankedService {

    private final RiotApiService riotApiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RankedService(RiotApiService riotApiService) {
        this.riotApiService = riotApiService;
    }

    public List<RankedEntryDto> getRankedInfo(String puuid, RiotRegion region) {
        String summonerJson = riotApiService.getSummonerByPuuid(puuid, region);
        String summonerId;
        try {
            JsonNode node = objectMapper.readTree(summonerJson);
            summonerId = node.path("id").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse summoner JSON", e);
        }

        String rankedJson = riotApiService.getRankedEntries(summonerId, region);
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
