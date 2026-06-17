package com.jw.backend;

import com.jw.backend.dto.GlobalChampionStatsDto;
import com.jw.backend.dto.GlobalOverviewDto;
import com.jw.backend.service.GlobalStatsService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/global")
public class GlobalStatsController {

    private final GlobalStatsService globalStatsService;

    public GlobalStatsController(GlobalStatsService globalStatsService) {
        this.globalStatsService = globalStatsService;
    }

    @GetMapping("/champions")
    public List<GlobalChampionStatsDto> getGlobalChampionStats(
            @RequestParam(required = false) Integer queueId
    ) {
        return globalStatsService.getGlobalChampionStats(queueId);
    }

    @GetMapping("/overview")
    public GlobalOverviewDto getOverview() {
        return globalStatsService.getOverviewStats();
    }
}
