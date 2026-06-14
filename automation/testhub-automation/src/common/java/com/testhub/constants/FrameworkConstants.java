package com.testhub.constants;

import java.nio.file.Paths;

/**
 * Centralised, compile-time constants — filesystem paths and well-known app
 * routes. Keeping these in one place stops magic strings leaking across the
 * codebase.
 */
public final class FrameworkConstants {

    private FrameworkConstants() {
    }

    // --- Filesystem -----------------------------------------------------------
    public static final String USER_DIR = System.getProperty("user.dir");
    // All shared resources now live under a single src/resources root (the module
    // is split by domain — common / api / ui / hybrid — not by Maven main/test).
    public static final String RESOURCES = Paths.get(USER_DIR, "src", "resources").toString();
    public static final String TEST_DATA_DIR = Paths.get(RESOURCES, "testdata").toString();
    public static final String OUTPUT_DIR = Paths.get(USER_DIR, "test-output").toString();
    public static final String REPORT_DIR = Paths.get(OUTPUT_DIR, "reports").toString();
    public static final String SCREENSHOT_DIR = Paths.get(OUTPUT_DIR, "screenshots").toString();
    public static final String DOWNLOAD_DIR = Paths.get(OUTPUT_DIR, "downloads").toString();

    public static final String REPORT_NAME = "testhub-extent-report.html";

    // --- Application routes (relative to base.url) ---------------------------
    public static final String ROUTE_LOGIN = "/login";
    public static final String ROUTE_REGISTER = "/register";
    public static final String ROUTE_DASHBOARD = "/";
    public static final String ROUTE_PROJECTS = "/projects";
    public static final String ROUTE_TEST_CASES = "/test-cases";
    public static final String ROUTE_USERS = "/users";

    // --- Browser localStorage keys (used by the hybrid test to inject a session) --
    public static final String LS_ACCESS_TOKEN = "accessToken";
    public static final String LS_REFRESH_TOKEN = "refreshToken";
}
