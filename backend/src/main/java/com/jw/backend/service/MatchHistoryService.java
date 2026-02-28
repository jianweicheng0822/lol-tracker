package com.jw.backend.service;

import com.jw.backend.dto.ChampionStatsDto;
import com.jw.backend.dto.MatchSummaryDto;
import com.jw.backend.dto.MatchTrendPointDto;
import com.jw.backend.entity.MatchRecord;
import com.jw.backend.repository.MatchRecordRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MatchHistoryService {

    private final MatchRecordRepository matchRecordRepository;

    public MatchHistoryService(MatchRecordRepository matchRecordRepository) {
        this.matchRecordRepository = matchRecordRepository;
    }

    public void persistMatchRecords(String puuid, String region, List<MatchSummaryDto> summaries) {
        for (MatchSummaryDto s : summaries) {
            if (!matchRecordRepository.existsByPuuidAndMatchId(puuid, s.matchId())) {
                MatchRecord r = new MatchRecord();
                r.setPuuid(puuid);
                r.setMatchId(s.matchId());
                r.setRegion(region);
                r.setChampionName(s.championName());
                r.setKills(s.kills());
                r.setDeaths(s.deaths());
                r.setAssists(s.assists());
                r.setWin(s.win());
                r.setGameDurationSec(s.gameDurationSec());
                r.setGameEndTimestamp(s.gameEndTimestamp());
                r.setQueueId(s.queueId());
                r.setTotalDamageDealtToChampions(s.totalDamageDealtToChampions());
                r.setGoldEarned(s.goldEarned());
                r.setTotalMinionsKilled(s.totalMinionsKilled());
                r.setNeutralMinionsKilled(s.neutralMinionsKilled());
                r.setPlacement(s.placement());
                r.setTeamTotalKills(s.teamTotalKills());
                matchRecordRepository.save(r);
            }
        }
    }

    public List<ChampionStatsDto> getChampionStats(String puuid) {
        List<MatchRecord> records = matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc(puuid);

        Map<String, List<MatchRecord>> byChampion = records.stream()
                .collect(Collectors.groupingBy(MatchRecord::getChampionName));

        return byChampion.entrySet().stream()
                .map(e -> {
                    String name = e.getKey();
                    List<MatchRecord> games = e.getValue();
                    int total = games.size();
                    int wins = (int) games.stream().filter(MatchRecord::isWin).count();
                    double winRate = total > 0 ? Math.round((wins * 100.0) / total * 10) / 10.0 : 0;
                    double avgKills = games.stream().mapToInt(MatchRecord::getKills).average().orElse(0);
                    double avgDeaths = games.stream().mapToInt(MatchRecord::getDeaths).average().orElse(0);
                    double avgAssists = games.stream().mapToInt(MatchRecord::getAssists).average().orElse(0);
                    double avgKda = avgDeaths == 0 ? avgKills + avgAssists : (avgKills + avgAssists) / avgDeaths;
                    double avgDamage = games.stream().mapToInt(MatchRecord::getTotalDamageDealtToChampions).average().orElse(0);
                    double avgCs = games.stream().mapToInt(g -> g.getTotalMinionsKilled() + g.getNeutralMinionsKilled()).average().orElse(0);

                    return new ChampionStatsDto(name, total, wins,
                            Math.round(winRate * 10) / 10.0,
                            Math.round(avgKills * 10) / 10.0,
                            Math.round(avgDeaths * 10) / 10.0,
                            Math.round(avgAssists * 10) / 10.0,
                            Math.round(avgKda * 100) / 100.0,
                            Math.round(avgDamage),
                            Math.round(avgCs * 10) / 10.0);
                })
                .sorted(Comparator.comparingInt(ChampionStatsDto::games).reversed())
                .toList();
    }

    public List<MatchTrendPointDto> getMatchTrends(String puuid) {
        List<MatchRecord> records = matchRecordRepository.findByPuuidOrderByGameEndTimestampDesc(puuid);

        // Return in chronological order (oldest first) for charts
        List<MatchRecord> chronological = new ArrayList<>(records);
        Collections.reverse(chronological);

        return chronological.stream()
                .map(r -> new MatchTrendPointDto(
                        r.getMatchId(),
                        r.getGameEndTimestamp(),
                        r.isWin(),
                        r.getKills(),
                        r.getDeaths(),
                        r.getAssists(),
                        r.getTotalDamageDealtToChampions(),
                        r.getGoldEarned(),
                        r.getTotalMinionsKilled() + r.getNeutralMinionsKilled(),
                        r.getChampionName(),
                        r.getQueueId()
                ))
                .toList();
    }
}
