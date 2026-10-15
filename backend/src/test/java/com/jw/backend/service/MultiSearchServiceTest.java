package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.ChampionMasteryDto;
import com.jw.backend.dto.MultiSearchPlayerDto;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MultiSearchServiceTest {

    @Mock
    private RiotApiService riotApiService;

    @Mock
    private RankedService rankedService;

    private MultiSearchService service;

    @BeforeEach
    void setUp() {
        service = new MultiSearchService(riotApiService, rankedService, new ObjectMapper());
    }

    private void stubFoundPlayer() {
        when(riotApiService.getAccountByRiotId("Faker", "KR1", RiotRegion.NA))
                .thenReturn("{\"puuid\":\"p1\",\"gameName\":\"Faker\",\"tagLine\":\"KR1\"}");
        when(riotApiService.getSummonerByPuuid("p1", RiotRegion.NA)).thenReturn("{\"profileIconId\":7}");
        when(rankedService.getRankedInfo("p1", RiotRegion.NA))
                .thenReturn(List.of(new RankedEntryDto("RANKED_SOLO_5x5", "CHALLENGER", "I", 1500, 300, 200)));
    }

    @Test
    void lookup_includesTopChampionsByMastery() {
        stubFoundPlayer();
        when(riotApiService.getTopChampionMasteries("p1", RiotRegion.NA, 3)).thenReturn("""
                [{"championId":103,"championLevel":7,"championPoints":250000},
                 {"championId":238,"championLevel":6,"championPoints":120000}]
                """);

        MultiSearchPlayerDto result = service.lookup(List.<String[]>of(new String[]{"Faker", "KR1"}), RiotRegion.NA).get(0);

        assertNull(result.error());
        assertEquals("p1", result.puuid());
        assertEquals(7, result.profileIconId());
        assertEquals(List.of(
                new ChampionMasteryDto(103, 7, 250_000),
                new ChampionMasteryDto(238, 6, 120_000)), result.topChampions());
    }

    @Test
    void lookup_stillReturnsThePlayerWhenMasteryFails() {
        stubFoundPlayer();
        when(riotApiService.getTopChampionMasteries(anyString(), any(), anyInt()))
                .thenThrow(new RuntimeException("429 Too Many Requests"));

        MultiSearchPlayerDto result = service.lookup(List.<String[]>of(new String[]{"Faker", "KR1"}), RiotRegion.NA).get(0);

        assertNull(result.error());
        assertEquals(1, result.rankedEntries().size());
        assertEquals(List.of(), result.topChampions());
    }

    @Test
    void lookup_unknownPlayer_reportsNotFoundWithoutCallingMastery() {
        when(riotApiService.getAccountByRiotId("Nobody", "XX", RiotRegion.NA))
                .thenThrow(new RuntimeException("404 Not Found"));

        MultiSearchPlayerDto result = service.lookup(List.<String[]>of(new String[]{"Nobody", "XX"}), RiotRegion.NA).get(0);

        assertEquals("Player not found", result.error());
        assertEquals(List.of(), result.topChampions());
        verify(riotApiService, never()).getTopChampionMasteries(anyString(), any(), anyInt());
    }
}
