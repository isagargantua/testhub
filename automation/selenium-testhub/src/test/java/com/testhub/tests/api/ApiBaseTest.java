package com.testhub.tests.api;

import com.testhub.api.ApiClient;
import com.testhub.config.ConfigManager;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.annotations.BeforeClass;

/**
 * Base for pure-API tests. Unlike {@link com.testhub.tests.BaseTest} it never
 * launches a browser — these tests hit the gateway directly with RestAssured.
 */
public abstract class ApiBaseTest {

    protected final Logger log = LogManager.getLogger(getClass());

    @BeforeClass(alwaysRun = true)
    public void warmUp() {
        if (ConfigManager.warmupEnabled()) {
            ApiClient api = new ApiClient();
            for (int i = 0; i < 8 && !api.isHealthy(); i++) {
                sleep();
            }
        }
    }

    protected ApiClient api() {
        return new ApiClient();
    }

    private void sleep() {
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
