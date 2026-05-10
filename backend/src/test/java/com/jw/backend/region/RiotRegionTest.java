/**
 * @file RiotRegionTest.java
 * @description Unit tests for the RiotRegion enum routing and platform mappings.
 * @module backend.test
 */
package com.jw.backend.region;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Validate that each {@link RiotRegion} enum value returns the correct routing cluster
 * and platform identifier for Riot API requests.
 */
class RiotRegionTest {

    /** Verify that NA routes to the americas cluster. */
    @Test
    void na_routing_returnsAmericas() {
        assertEquals("americas", RiotRegion.NA.routing());
    }

    /** Verify that EUW routes to the europe cluster. */
    @Test
    void euw_routing_returnsEurope() {
        assertEquals("europe", RiotRegion.EUW.routing());
    }

    /** Verify that KR routes to the asia cluster. */
    @Test
    void kr_routing_returnsAsia() {
        assertEquals("asia", RiotRegion.KR.routing());
    }

    /** Verify that JP routes to the asia cluster. */
    @Test
    void jp_routing_returnsAsia() {
        assertEquals("asia", RiotRegion.JP.routing());
    }

    /** Verify that BR routes to the americas cluster. */
    @Test
    void br_routing_returnsAmericas() {
        assertEquals("americas", RiotRegion.BR.routing());
    }

    /** Verify that OCE routes to the americas cluster. */
    @Test
    void oce_routing_returnsAmericas() {
        assertEquals("americas", RiotRegion.OCE.routing());
    }

    /** Verify that NA returns platform "na1". */
    @Test
    void na_platform_returnsNa1() {
        assertEquals("na1", RiotRegion.NA.platform());
    }

    /** Verify that EUW returns platform "euw1". */
    @Test
    void euw_platform_returnsEuw1() {
        assertEquals("euw1", RiotRegion.EUW.platform());
    }

    /** Verify that KR returns platform "kr". */
    @Test
    void kr_platform_returnsKr() {
        assertEquals("kr", RiotRegion.KR.platform());
    }

    /** Verify that JP returns platform "jp1". */
    @Test
    void jp_platform_returnsJp1() {
        assertEquals("jp1", RiotRegion.JP.platform());
    }

    /** Verify that BR returns platform "br1". */
    @Test
    void br_platform_returnsBr1() {
        assertEquals("br1", RiotRegion.BR.platform());
    }

    /** Verify that OCE returns platform "oc1". */
    @Test
    void oce_platform_returnsOc1() {
        assertEquals("oc1", RiotRegion.OCE.platform());
    }

    /** Verify that all regions have a non-null routing value. */
    @Test
    void allRegions_haveNonNullRouting() {
        for (RiotRegion region : RiotRegion.values()) {
            assertNotNull(region.routing(), region.name() + " should have a routing value");
        }
    }

    /** Verify that all regions have a non-null platform value. */
    @Test
    void allRegions_haveNonNullPlatform() {
        for (RiotRegion region : RiotRegion.values()) {
            assertNotNull(region.platform(), region.name() + " should have a platform value");
        }
    }
}
