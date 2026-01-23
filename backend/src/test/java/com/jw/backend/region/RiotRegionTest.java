package com.jw.backend.region;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RiotRegionTest {

    // =====================================================
    // ROUTING TESTS - Test the routing() method
    // routing() returns: "americas", "europe", or "asia"
    // =====================================================

    @Test
    void na_routing_returnsAmericas() {
        // ARRANGE - Get the enum value we want to test
        RiotRegion region = RiotRegion.NA;

        // ACT - Call the method we're testing
        String result = region.routing();

        // ASSERT - Check if the result is what we expect
        assertEquals("americas", result);
    }

    @Test
    void euw_routing_returnsEurope() {
        RiotRegion region = RiotRegion.EUW;
        String result = region.routing();
        assertEquals("europe", result);
    }

    @Test
    void kr_routing_returnsAsia() {
        RiotRegion region = RiotRegion.KR;
        String result = region.routing();
        assertEquals("asia", result);
    }

    @Test
    void jp_routing_returnsAsia() {
        // JP is in Asia region (not KR!)
        RiotRegion region = RiotRegion.JP;
        String result = region.routing();
        assertEquals("asia", result);
    }

    @Test
    void br_routing_returnsAmericas() {
        // BR (Brazil) is in Americas region (not Asia!)
        RiotRegion region = RiotRegion.BR;
        String result = region.routing();
        assertEquals("americas", result);
    }

    @Test
    void oce_routing_returnsAmericas() {
        // OCE (Oceania) is routed through Americas
        RiotRegion region = RiotRegion.OCE;
        String result = region.routing();
        assertEquals("americas", result);
    }

    // =====================================================
    // PLATFORM TESTS - Test the platform() method
    // platform() returns: "na1", "euw1", "kr", "jp1", etc.
    // =====================================================

    @Test
    void na_platform_returnsNa1() {
        RiotRegion region = RiotRegion.NA;
        String result = region.platform();
        assertEquals("na1", result);
    }

    @Test
    void euw_platform_returnsEuw1() {
        RiotRegion region = RiotRegion.EUW;
        String result = region.platform();
        assertEquals("euw1", result);
    }

    @Test
    void kr_platform_returnsKr() {
        RiotRegion region = RiotRegion.KR;
        String result = region.platform();
        assertEquals("kr", result);
    }

    @Test
    void jp_platform_returnsJp1() {
        RiotRegion region = RiotRegion.JP;
        String result = region.platform();
        assertEquals("jp1", result);
    }

    @Test
    void br_platform_returnsBr1() {
        RiotRegion region = RiotRegion.BR;
        String result = region.platform();
        assertEquals("br1", result);
    }

    @Test
    void oce_platform_returnsOc1() {
        RiotRegion region = RiotRegion.OCE;
        String result = region.platform();
        assertEquals("oc1", result);
    }

    // =====================================================
    // SAFETY TESTS - Loop through ALL regions
    // These tests protect against future bugs.
    // If someone adds a new region with null values,
    // these tests will catch it!
    // =====================================================

    @Test
    void allRegions_haveNonNullRouting() {
        // RiotRegion.values() returns an array of ALL enum values:
        // [NA, EUW, KR, JP, BR, OCE]

        for (RiotRegion region : RiotRegion.values()) {
            // For each region, check that routing() is not null

            // assertNotNull(value, message)
            // - Fails the test if 'value' is null
            // - 'message' explains what went wrong (shown if test fails)

            assertNotNull(
                region.routing(),                              // value to check
                region.name() + " should have a routing value" // error message
            );

            // Example: if NA.routing() returned null, you'd see:
            // "NA should have a routing value"
        }
    }

    @Test
    void allRegions_haveNonNullPlatform() {
        // Same pattern: loop through all regions
        for (RiotRegion region : RiotRegion.values()) {
            // Check that platform() is not null for each region
            assertNotNull(
                region.platform(),
                region.name() + " should have a platform value"
            );
        }
    }
}