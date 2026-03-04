package com.jw.backend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards non-API, non-static-asset requests to index.html so React Router
 * can handle client-side routing in production (where Spring Boot serves the
 * built frontend from /static resources).
 *
 * Only active when the frontend build is present in the classpath. In dev mode
 * (Vite dev server on :5173), this controller is never hit because the browser
 * talks directly to Vite.
 */
@Controller
public class SpaForwardingController {

    /**
     * Matches any path that:
     *  - Does NOT start with /api/
     *  - Does NOT start with /h2-console/
     *  - Does NOT contain a file extension (e.g. .js, .css, .png)
     *
     * These are assumed to be React Router paths and forwarded to index.html.
     */
    @GetMapping(value = "/{path:[^\\.]*}")
    public String forwardRoot() {
        return "forward:/index.html";
    }

    @GetMapping(value = "/{path1:[^\\.]*}/{path2:[^\\.]*}")
    public String forwardNested2() {
        return "forward:/index.html";
    }

    @GetMapping(value = "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}")
    public String forwardNested3() {
        return "forward:/index.html";
    }

    @GetMapping(value = "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}/{p4:[^\\.]*}")
    public String forwardNested4() {
        return "forward:/index.html";
    }
}
