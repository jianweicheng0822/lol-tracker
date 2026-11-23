package com.jw.backend.repository;

import com.jw.backend.entity.ReleasedUsername;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReleasedUsernameRepository extends JpaRepository<ReleasedUsername, String> {
}
