package com.jw.backend.repository;

import com.jw.backend.entity.AppUser;
import com.jw.backend.entity.SearchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    List<SearchHistory> findTop10ByUserOrderBySearchedAtDesc(AppUser user);
    Optional<SearchHistory> findByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
        AppUser user, String gameName, String tagLine, String region);
    Optional<SearchHistory> findFirstByUserOrderBySearchedAtAsc(AppUser user);
    void deleteByUserAndGameNameIgnoreCaseAndTagLineIgnoreCaseAndRegionIgnoreCase(
        AppUser user, String gameName, String tagLine, String region);
    void deleteAllByUser(AppUser user);
    long countByUser(AppUser user);
}
