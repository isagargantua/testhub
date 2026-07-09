package com.testhub.api;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testhub.api.models.AuthResponse;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.RunDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.config.ConfigManager;
import com.testhub.enums.Priority;
import com.testhub.enums.ResultStatus;
import com.testhub.exceptions.FrameworkException;
import io.restassured.RestAssured;
import io.restassured.config.ObjectMapperConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;

/**
 * RestAssured-backed client for the testHub gateway. This is the "hybrid" half
 * of the framework: instead of clicking through six screens to reach the state
 * a UI test needs, tests seed that state over the API in milliseconds, then
 * verify behaviour through the browser.
 *
 * <p>An instance carries an optional bearer token, so the same client is used
 * both for pure API tests and for fast UI-test setup/teardown.
 */
public class ApiClient {

    private static final Logger log = LogManager.getLogger(ApiClient.class);

    private static final RestAssuredConfig CONFIG = RestAssuredConfig.config()
            .objectMapperConfig(new ObjectMapperConfig().jackson2ObjectMapperFactory(
                    (type, charset) -> new ObjectMapper()
                            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)));

    private final String baseUrl;
    private String token;

    public ApiClient() {
        this.baseUrl = ConfigManager.apiBaseUrl();
    }

    public ApiClient(String token) {
        this();
        this.token = token;
    }

    public String token() {
        return token;
    }

    // --- request base --------------------------------------------------------

    private RequestSpecification base() {
        RequestSpecification spec = given()
                .config(CONFIG)
                .baseUri(baseUrl)
                .contentType("application/json")
                .accept("application/json");
        if (token != null && !token.isBlank()) {
            spec.header("Authorization", "Bearer " + token);
        }
        return spec;
    }

    private static Response ensure2xx(Response response, String action) {
        int code = response.statusCode();
        if (code < 200 || code >= 300) {
            throw new FrameworkException("API " + action + " failed (HTTP " + code + "): "
                    + response.getBody().asString());
        }
        return response;
    }

    // --- health / warm-up ----------------------------------------------------

    /** Pings the gateway /health; returns true once it answers 2xx. */
    public boolean isHealthy() {
        try {
            return given().config(CONFIG).baseUri(baseUrl).get("/health").statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Polls the gateway /health until it responds or the timeout elapses.
     * Absorbs the free-tier cold start before the first real request.
     *
     * @return true when the gateway became healthy within the budget
     */
    public boolean waitUntilHealthy(java.time.Duration timeout) {
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        while (!isHealthy()) {
            if (System.currentTimeMillis() >= deadline) {
                log.warn("Gateway not healthy after {} s — continuing anyway", timeout.toSeconds());
                return false;
            }
            sleepMillis(3000);
        }
        return true;
    }

    /**
     * Pings every configured health endpoint ({@code health.check.urls},
     * defaults to the gateway's /health). Returns true only when all answer 200.
     * Deliberately does NOT short-circuit: on the free tier each ping is what
     * triggers that service's wake-up, so one pass starts all of them waking.
     */
    public static boolean allServicesHealthy() {
        boolean allUp = true;
        for (String url : ConfigManager.healthCheckUrls()) {
            try {
                if (given().get(url).statusCode() != 200) {
                    allUp = false;
                }
            } catch (Exception e) {
                allUp = false;
            }
        }
        return allUp;
    }

    /**
     * Polls all configured health endpoints until every service answers 200 or
     * the timeout elapses. This is the API-side equivalent of the login page's
     * "Wake services" button: Render's edge rate-limits (429) requests routed
     * to a hibernating service, so real calls must wait for this.
     */
    public static boolean waitUntilAllServicesHealthy(java.time.Duration timeout) {
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        while (System.currentTimeMillis() < deadline) {
            if (allServicesHealthy()) {
                return true;
            }
            sleepMillis(3000);
        }
        boolean healthy = allServicesHealthy();
        if (!healthy) {
            log.warn("Not all services healthy after {} s — continuing anyway", timeout.toSeconds());
        }
        return healthy;
    }

    /**
     * Warms the domain (core) service — the gateway's /health doesn't touch it,
     * so the first dashboard/projects load would otherwise eat a cold start.
     * Best-effort: never throws (a throttled 429 here is harmless).
     */
    public void warmDomainServices() {
        try {
            base().get("/api/dashboard/stats");
            base().get("/api/projects");
        } catch (Exception ignored) {
            // Warm-up is opportunistic; a failure just means the first test pays the cold start.
        }
    }

    // --- auth ----------------------------------------------------------------

    public AuthResponse register(String name, String email, String password) {
        Response response = postWithThrottleRetry("/api/auth/register",
                Map.of("name", name, "email", email, "password", password), "register");
        AuthResponse auth = ensure2xx(response, "register").as(AuthResponse.class);
        this.token = auth.accessToken;
        return auth;
    }

    public AuthResponse login(String email, String password) {
        Response response = postWithThrottleRetry("/api/auth/login",
                Map.of("email", email, "password", password), "login");
        AuthResponse auth = ensure2xx(response, "login").as(AuthResponse.class);
        this.token = auth.accessToken;
        return auth;
    }

    /**
     * POSTs the body, retrying (bounded) when the live free tier answers 429.
     * Honors the {@code Retry-After} header when present, otherwise backs off
     * 10 s, then 20 s — a hibernating Render service needs ~25 s to wake. Any
     * non-429 response is returned as-is for the caller's status handling —
     * this only smooths over infrastructure throttling.
     */
    private Response postWithThrottleRetry(String path, Map<String, ?> body, String action) {
        final int maxAttempts = 3;
        Response response = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            response = base().body(body).post(path);
            if (response.statusCode() != 429 || attempt == maxAttempts) {
                return response;
            }
            long waitSeconds = retryAfterSeconds(response, 10L * attempt);
            log.warn("API {} throttled (HTTP 429) — retrying in {} s (attempt {}/{})",
                    action, waitSeconds, attempt, maxAttempts);
            sleepMillis(waitSeconds * 1000);
        }
        return response;
    }

    private static long retryAfterSeconds(Response response, long fallback) {
        String header = response.getHeader("Retry-After");
        if (header != null) {
            try {
                // Cap so a hostile/huge value can't stall the suite.
                return Math.min(Long.parseLong(header.trim()), 30);
            } catch (NumberFormatException ignored) {
                // Fall through to the computed backoff.
            }
        }
        return fallback;
    }

    private static void sleepMillis(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Logs in if the account exists, otherwise registers it. Handy for seeded users. */
    public AuthResponse loginOrRegister(String name, String email, String password) {
        try {
            return login(email, password);
        } catch (FrameworkException e) {
            log.info("Login failed for {} — registering instead", email);
            AuthResponse auth = register(name, email, password);
            this.token = auth.accessToken;
            return auth;
        }
    }

    // --- projects ------------------------------------------------------------

    public ProjectDto createProject(String name, String description) {
        Response response = base().body(Map.of("name", name, "description", description))
                .post("/api/projects");
        return ensure2xx(response, "createProject").as(ProjectDto.class);
    }

    public void deleteProject(String projectId) {
        ensure2xx(base().delete("/api/projects/" + projectId), "deleteProject");
    }

    // --- suites --------------------------------------------------------------

    public SuiteDto createSuite(String projectId, String name, String description) {
        Response response = base().body(Map.of("name", name, "description", description))
                .post("/api/suites/project/" + projectId);
        return ensure2xx(response, "createSuite").as(SuiteDto.class);
    }

    // --- test cases ----------------------------------------------------------

    public TestCaseDto createTestCase(String suiteId, String title, Priority priority) {
        return createTestCase(suiteId, title, "Seeded by API", "1. step", "expected", priority);
    }

    public TestCaseDto createTestCase(String suiteId, String title, String description,
                                      String steps, String expected, Priority priority) {
        Response response = base().body(Map.of(
                "title", title,
                "description", description,
                "steps", steps,
                "expected", expected,
                "priority", priority.name())).post("/api/testcases/suite/" + suiteId);
        return ensure2xx(response, "createTestCase").as(TestCaseDto.class);
    }

    // --- runs ----------------------------------------------------------------

    public RunDto createRun(String projectId, String name, List<String> testCaseIds) {
        Response response = base().body(Map.of(
                "name", name,
                "description", "Seeded by API",
                "testCaseIds", testCaseIds)).post("/api/runs/project/" + projectId);
        return ensure2xx(response, "createRun").as(RunDto.class);
    }

    public void markResult(String runId, String testCaseId, ResultStatus status) {
        ensure2xx(base().body(Map.of("testCaseId", testCaseId, "status", status.name()))
                .post("/api/runs/" + runId + "/results"), "markResult");
    }
}
