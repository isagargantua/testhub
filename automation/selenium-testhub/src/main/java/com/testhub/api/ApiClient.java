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
     * Pings all three service health endpoints independently.
     * Returns true only when every service replies {"status":"ok"}.
     */
    public static boolean allServicesHealthy() {
        String[] urls = {
            "https://testhub-auth-service.onrender.com/health",
            "https://testhub-gateway.onrender.com/health",
            "https://testhub-core-service.onrender.com/health"
        };
        for (String url : urls) {
            try {
                int code = given().get(url).statusCode();
                if (code != 200) return false;
            } catch (Exception e) {
                return false;
            }
        }
        return true;
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
        Response response = base().body(Map.of("name", name, "email", email, "password", password))
                .post("/api/auth/register");
        AuthResponse auth = ensure2xx(response, "register").as(AuthResponse.class);
        this.token = auth.accessToken;
        return auth;
    }

    public AuthResponse login(String email, String password) {
        Response response = base().body(Map.of("email", email, "password", password))
                .post("/api/auth/login");
        AuthResponse auth = ensure2xx(response, "login").as(AuthResponse.class);
        this.token = auth.accessToken;
        return auth;
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
