/**
 * @file SubscriptionControllerTest.java
 * @description Unit tests for the subscription tier and upgrade controller endpoints.
 * @module backend.test
 */
package com.jw.backend;

import com.jw.backend.entity.AppUser;
import com.jw.backend.security.JwtUtil;
import com.jw.backend.service.SubscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validate the {@link SubscriptionController} for retrieving the current subscription
 * tier and upgrading a user from free to PRO.
 */
@WebMvcTest(SubscriptionController.class)
@AutoConfigureMockMvc(addFilters = false)
class SubscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private SubscriptionService subscriptionService;

    /** Verify that the default tier for a new user is 0 (free). */
    @Test
    void getTier_returnsFreeByDefault() throws Exception {
        AppUser freeUser = new AppUser();
        when(subscriptionService.getOrCreateUser(any())).thenReturn(freeUser);

        mockMvc.perform(get("/api/tier"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(0));
    }

    /** Verify that an upgraded user returns tier 1 (PRO). */
    @Test
    void getTier_returnsProForUpgradedUser() throws Exception {
        AppUser proUser = new AppUser();
        proUser.setTier(1);
        when(subscriptionService.getOrCreateUser(any())).thenReturn(proUser);

        mockMvc.perform(get("/api/tier"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));
    }

    /** Verify that the upgrade endpoint sets the user tier to PRO and invokes the service. */
    @Test
    void upgrade_returnsProTier() throws Exception {
        mockMvc.perform(get("/api/upgrade"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tier").value(1));

        verify(subscriptionService).upgrade(any());
    }
}
