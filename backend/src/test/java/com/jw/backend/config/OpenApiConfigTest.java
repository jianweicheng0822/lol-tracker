package com.jw.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    private final OpenApiConfig config = new OpenApiConfig();

    @Test
    void openAPI_returnsConfiguredSpec() {
        OpenAPI api = config.openAPI();
        assertNotNull(api);
        assertEquals("LoL Tracker API", api.getInfo().getTitle());
        assertEquals("1.0.0", api.getInfo().getVersion());
    }

    @Test
    void openAPI_hasBearerAuthScheme() {
        OpenAPI api = config.openAPI();
        assertNotNull(api.getComponents().getSecuritySchemes().get("bearerAuth"));
        assertEquals("bearer", api.getComponents().getSecuritySchemes().get("bearerAuth").getScheme());
    }
}
