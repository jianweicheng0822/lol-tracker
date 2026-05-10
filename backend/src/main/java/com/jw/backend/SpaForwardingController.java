/**
 * @file SpaForwardingController.java
 * @description Controller that forwards non-static paths to index.html for React Router support.
 * @module backend.controller
 */
package com.jw.backend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forward non-static URL paths to index.html so React Router can handle client-side routing.
 *
 * <p>In production, the React SPA bundle is served from Spring Boot's static resources.
 * Without these forwarding rules, direct navigation or page refresh on a client-side route
 * would result in a 404. The regex pattern {@code [^\\.]*} excludes paths containing a dot,
 * ensuring static assets (JS, CSS, images) are served normally.</p>
 */
@Controller
public class SpaForwardingController {

    /**
     * Forward single-segment paths (e.g., /player, /favorites).
     *
     * @return forward directive to index.html
     */
    @GetMapping(value = "/{path:[^\\.]*}")
    public String forwardRoot() {
        return "forward:/index.html";
    }

    /**
     * Forward two-segment paths (e.g., /player/SummonerName).
     *
     * @return forward directive to index.html
     */
    @GetMapping(value = "/{path1:[^\\.]*}/{path2:[^\\.]*}")
    public String forwardNested2() {
        return "forward:/index.html";
    }

    /**
     * Forward three-segment paths (e.g., /player/region/name).
     *
     * @return forward directive to index.html
     */
    @GetMapping(value = "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}")
    public String forwardNested3() {
        return "forward:/index.html";
    }

    /**
     * Forward four-segment paths for deeply nested client routes.
     *
     * @return forward directive to index.html
     */
    @GetMapping(value = "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}/{p4:[^\\.]*}")
    public String forwardNested4() {
        return "forward:/index.html";
    }
}
