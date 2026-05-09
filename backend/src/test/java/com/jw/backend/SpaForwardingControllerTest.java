package com.jw.backend;

import com.jw.backend.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SpaForwardingController.class)
@AutoConfigureMockMvc(addFilters = false)
class SpaForwardingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @Test
    void forwardRoot_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/somepage"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void forwardNested2_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/player/details"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void forwardNested3_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/a/b/c"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void forwardNested4_forwardsToIndex() throws Exception {
        mockMvc.perform(get("/a/b/c/d"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }
}
