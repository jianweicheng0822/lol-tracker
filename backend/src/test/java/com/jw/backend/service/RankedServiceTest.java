package com.jw.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jw.backend.dto.RankedEntryDto;
import com.jw.backend.region.RiotRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RankedServiceTest {

    @Mock
    private RiotApiService riotApiService;

    private RankedService rankedService;

    @BeforeEach
    void setUp() {
        rankedService = new RankedService(riotApiService, new ObjectMapper());
    }

    @Test
    void getRankedInfo_parsesJsonCorrectly() {
        String json = """
            [
                {"queueType":"RANKED_SOLO_5x5","tier":"GOLD","rank":"I","leaguePoints":75,"wins":100,"losses":80},
                {"queueType":"RANKED_FLEX_SR","tier":"SILVER","rank":"II","leaguePoints":50,"wins":40,"losses":30}
            ]
            """;
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn(json);

        List<RankedEntryDto> result = rankedService.getRankedInfo("puuid", RiotRegion.NA);

        assertEquals(2, result.size());
        assertEquals("RANKED_SOLO_5x5", result.get(0).queueType());
        assertEquals("GOLD", result.get(0).tier());
        assertEquals("I", result.get(0).rank());
        assertEquals(75, result.get(0).leaguePoints());
        assertEquals(100, result.get(0).wins());
        assertEquals(80, result.get(0).losses());
    }

    @Test
    void getRankedInfo_withEmptyArray_returnsEmptyList() {
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn("[]");

        List<RankedEntryDto> result = rankedService.getRankedInfo("puuid", RiotRegion.NA);

        assertTrue(result.isEmpty());
    }

    @Test
    void getRankedInfo_withInvalidJson_throwsException() {
        when(riotApiService.getRankedEntriesByPuuid("puuid", RiotRegion.NA)).thenReturn("not json");

        assertThrows(RuntimeException.class, () -> rankedService.getRankedInfo("puuid", RiotRegion.NA));
    }
}
