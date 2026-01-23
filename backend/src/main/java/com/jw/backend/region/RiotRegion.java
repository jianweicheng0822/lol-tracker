package com.jw.backend.region;

/**
 * User-facing regions (used by frontend query param).
 * We map each one to:
 * - routing region (account-v1, match-v5): americas / europe / asia
 * - platform region (summoner-v4, league-v4): na1 / euw1 / kr / ...
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

    RiotRegion(String routingRegion, String platformRegion) {
        this.routingRegion = routingRegion;
        this.platformRegion = platformRegion;
    }

    public String routing() {
        return routingRegion;
    }

    public String platform() {
        return platformRegion;
    }
}
