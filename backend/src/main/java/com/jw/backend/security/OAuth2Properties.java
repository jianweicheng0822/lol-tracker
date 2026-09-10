package com.jw.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "oauth2")
public class OAuth2Properties {

    private ProviderConfig google = new ProviderConfig();
    private ProviderConfig discord = new ProviderConfig();
    private String frontendUrl = "http://localhost:5173";

    public static class ProviderConfig {
        private String clientId = "";
        private String clientSecret = "";

        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }

        public String getClientSecret() { return clientSecret; }
        public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank();
        }
    }

    public ProviderConfig getGoogle() { return google; }
    public void setGoogle(ProviderConfig google) { this.google = google; }

    public ProviderConfig getDiscord() { return discord; }
    public void setDiscord(ProviderConfig discord) { this.discord = discord; }

    public String getFrontendUrl() { return frontendUrl; }
    public void setFrontendUrl(String frontendUrl) { this.frontendUrl = frontendUrl; }

    public ProviderConfig getProvider(String name) {
        return switch (name.toLowerCase()) {
            case "google" -> google;
            case "discord" -> discord;
            default -> null;
        };
    }
}
