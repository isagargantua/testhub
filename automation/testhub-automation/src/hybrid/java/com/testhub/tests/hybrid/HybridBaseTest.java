package com.testhub.tests.hybrid;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.driver.DriverManager;
import com.testhub.reports.ExtentManager;
import com.testhub.tests.BaseTest;
import com.testhub.utils.JavaScriptUtils;
import org.testng.annotations.BeforeClass;

/**
 * Base for the <b>hybrid</b> tests: shared API warm-up plus the one bridging
 * step that defines this layer — taking an API-obtained session and signing the
 * browser in with it. Kept here so the hybrid tests stay tiny and the bridge
 * exists in exactly one place.
 */
public abstract class HybridBaseTest extends BaseTest {

    @BeforeClass(alwaysRun = true)
    public void warmUpApi() {
        if (ConfigManager.warmupEnabled()) {
            ApiClient.waitUntilAllServicesHealthy(java.time.Duration.ofSeconds(120));
        }
    }

    /** Writes the API-obtained tokens into localStorage so the SPA is signed in. */
    protected void injectApiSession(AuthResponse auth) {
        if (auth.user != null && auth.user.email != null) {
            ExtentManager.setRunUser(auth.user.email);
        }
        // Must be on the app origin before localStorage is writable.
        DriverManager.getDriver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_LOGIN);
        JavaScriptUtils.setLocalStorage(FrameworkConstants.LS_ACCESS_TOKEN, auth.accessToken);
        JavaScriptUtils.setLocalStorage(FrameworkConstants.LS_REFRESH_TOKEN, auth.refreshToken);
        DriverManager.getDriver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_DASHBOARD);
    }
}
