/**
 * @file BackendApplication.java
 * @description Spring Boot entry point for the LoL Tracker backend service.
 * @module backend
 */
package com.jw.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Bootstrap class for the Spring Boot application.
 *
 * <p>Triggers component scanning, auto-configuration, and embedded server startup.</p>
 */
@SpringBootApplication
public class BackendApplication {

	/**
	 * Launch the Spring Boot application.
	 *
	 * @param args command-line arguments forwarded to the Spring environment
	 */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
