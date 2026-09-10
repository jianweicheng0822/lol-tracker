package com.jw.backend.service;

import com.jw.backend.dto.SearchHistoryResponse;
import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.SearchHistory;
import com.jw.backend.repository.SearchHistoryRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class SearchHistoryService {

    private final SearchHistoryRepository repository;

    public SearchHistoryService(SearchHistoryRepository repository) {
        this.repository = repository;
    }

    public List<SearchHistoryResponse> getHistory(AppUser user) {
        return repository.findTop10ByUserOrderBySearchedAtDesc(user).stream()
            .map(h -> new SearchHistoryResponse(h.getGameName(), h.getTagLine(), h.getRegion(), h.getSearchedAt()))
            .toList();
    }

    public void addEntry(AppUser user, String gameName, String tagLine, String region) {
        Optional<SearchHistory> existing = repository
            .findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(user, gameName, tagLine, region);

        if (existing.isPresent()) {
            SearchHistory entry = existing.get();
            entry.setGameName(gameName);
            entry.setTagLine(tagLine);
            entry.setRegion(region);
            entry.setSearchedAt(Instant.now());
            repository.save(entry);
        } else {
            SearchHistory entry = new SearchHistory(gameName, tagLine, region);
            entry.setUser(user);
            repository.save(entry);

            if (repository.countByUser(user) > 10) {
                repository.findFirstByUserOrderBySearchedAtAsc(user)
                    .ifPresent(repository::delete);
            }
        }
    }

    @Transactional
    public void removeEntry(AppUser user, String gameName, String tagLine, String region) {
        repository.deleteByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
            user, gameName, tagLine, region);
    }

    @Transactional
    public void clearHistory(AppUser user) {
        repository.deleteAllByUser(user);
    }
}
