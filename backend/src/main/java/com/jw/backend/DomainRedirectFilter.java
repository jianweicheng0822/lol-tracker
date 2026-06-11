package com.jw.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DomainRedirectFilter extends OncePerRequestFilter {

    @Value("${cors.allowed-origin:http://localhost:5173}")
    private String allowedOrigin;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String host = request.getHeader("Host");
        if (host != null && host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+.*")) {
            String path = request.getRequestURI();
            String query = request.getQueryString();
            String redirect = allowedOrigin + path + (query != null ? "?" + query : "");
            response.sendRedirect(redirect);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
