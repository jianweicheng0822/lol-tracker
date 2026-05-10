/**
 * @file RiotRegion.java
 * @description Enum mapping supported regions to their Riot API routing and platform hosts.
 * @module backend.region
 */
package com.jw.backend.region;

/**
 * Map supported game regions to their Riot API host configurations.
 *
 * <p>Riot uses separate host types per API version:
 * <ul>
 *   <li><strong>Routing regions</strong> (americas/europe/asia) — used by Account-v1 and Match-v5</li>
 *   <li><strong>Platform regions</strong> (na1/euw1/kr) — used by Summoner-v4 and League-v4</li>
 * </ul>
 * </p>
 */
public enum RiotRegion {

    NA("americas", "na1"),
    EUW("europe", "euw1"),
    KR("asia", "kr"),
    JP("asia", "jp1"),
    BR("americas", "br1"),
    OCE("americas", "oc1");

    private final String routingRegion;
    private final String platformRegion;

    /**
     * Construct a region with its routing and platform host identifiers.
     *
     * @param routingRegion  the routing cluster (americas, europe, or asia)
     * @param platformRegion the platform-specific host prefix (e.g., na1, euw1)
     */
    RiotRegion(String routingRegion, String platformRegion) {
        this.routingRegion = routingRegion;
        this.platformRegion = platformRegion;
    }

    /**
     * Get the routing region for Account-v1 and Match-v5 API calls.
     *
     * @return the routing cluster identifier
     */
    public String routing() {
        return routingRegion;
    }

    /**
     * Get the platform region for Summoner-v4 and League-v4 API calls.
     *
     * @return the platform host prefix
     */
    public String platform() {
        return platformRegion;
    }
}
