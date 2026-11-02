package com.jw.backend.repository;

import com.jw.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findTop200ByOrderByCreatedAtDesc();
    long countByCreatedAtAfter(Instant since);
}
