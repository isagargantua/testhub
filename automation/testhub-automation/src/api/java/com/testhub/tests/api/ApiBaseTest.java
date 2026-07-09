package com.testhub.tests.api;

import com.testhub.api.ApiClient;
import com.testhub.config.ConfigManager;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.annotations.BeforeClass;

import java.time.Duration;

/**
 * Base for pure-API tests. Unlike {@link com.testhub.tests.BaseTest} it never
 * launches a browser — these tests hit the gateway directly with RestAssured.
 */
public abstract class ApiBaseTest {

    protected final Logger log = LogManager.getLogger(getClass());

    @BeforeClass(alwaysRun = true)
    public void warmUp() {
        if (ConfigManager.warmupEnabled()) {
            // Wake EVERY service, not just the gateway — Render's edge answers
            // 429 for requests routed to a hibernating auth/core service.
            ApiClient.waitUntilAllServicesHealthy(Duration.ofSeconds(120));
        }
    }

    protected ApiClient api() {
        return new ApiClient();
    }
}
