package com.jw.backend.service;

import com.jw.backend.dto.GlobalChampionStatsDto;
import com.jw.backend.dto.GlobalOverviewDto;
import com.jw.backend.repository.MatchRecordRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class GlobalStatsService {

    private final MatchRecordRepository matchRecordRepository;

    public GlobalStatsService(MatchRecordRepository matchRecordRepository) {
        this.matchRecordRepository = matchRecordRepository;
    }

    public List<GlobalChampionStatsDto> getGlobalChampionStats(Integer queueId) {
        List<Object[]> rows = matchRecordRepository.aggregateChampionStats(queueId);
        long totalMatches = matchRecordRepository.countDistinctMatches(queueId);

        List<GlobalChampionStatsDto> results = new ArrayList<>();
        for (Object[] row : rows) {
            String championName = (String) row[0];
            long games = (Long) row[1];
            long wins = (Long) row[2];
            double avgKills = (Double) row[3];
            double avgDeaths = (Double) row[4];
            double avgAssists = (Double) row[5];
            double avgCs = (Double) row[6];
            double avgDamage = (Double) row[7];
            double avgGold = (Double) row[8];

            double winRate = games > 0 ? (double) wins / games * 100.0 : 0.0;
            double pickRate = totalMatches > 0 ? (double) games / totalMatches * 100.0 : 0.0;
            double avgKda = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;

            results.add(new GlobalChampionStatsDto(
                    championName,
                    (int) games,
                    (int) wins,
                    Math.round(winRate * 10.0) / 10.0,
                    Math.round(pickRate * 10.0) / 10.0,
                    Math.round(avgKills * 10.0) / 10.0,
                    Math.round(avgDeaths * 10.0) / 10.0,
                    Math.round(avgAssists * 10.0) / 10.0,
                    Math.round(avgKda * 100.0) / 100.0,
                    Math.round(avgCs * 10.0) / 10.0,
                    Math.round(avgDamage * 10.0) / 10.0,
                    Math.round(avgGold * 10.0) / 10.0
            ));
        }
        return results;
    }

    public GlobalOverviewDto getOverviewStats() {
        long totalMatches = matchRecordRepository.countDistinctMatches(null);
        long totalPlayers = matchRecordRepository.countDistinctPlayers();
        long totalChampions = matchRecordRepository.countDistinctChampions();
        return new GlobalOverviewDto(totalMatches, totalPlayers, totalChampions);
    }
}
