package com.testhub.tests.hybrid;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.pages.DashboardPage;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * <b>HYBRID</b> test #1 — registers a <b>fresh</b> user and seeds data over the
 * <b>API</b> (RestAssured, fast), bridges that session into the browser, then
 * verifies through the real <b>UI</b> that the dashboard reflects the seeded
 * data. A fresh account is required here because the assertions rely on exact
 * counts ("Projects = 2"), which only hold on an empty account.
 *
 * <p>Note: registration is throttled on the live free tier (HTTP 429 under
 * bursty runs) — see {@link ApiLoginExistingUserTest} for the throttle-free
 * variant that signs in with the standing account instead.
 */
public class ApiLoginDashboardTest extends HybridBaseTest {

    @Test(groups = {"hybrid"},
            description = "API login + API-seeded projects, verified on the dashboard through the UI")
    public void apiSeededProjectsAppearOnDashboardUi() {
        // 1. Register and seed two projects entirely over the API (milliseconds, no clicks).
        ApiClient api = new ApiClient();
        AuthResponse auth = api.register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
        api.createProject(TestDataFactory.projectName(), "seeded via API");
        api.createProject(TestDataFactory.projectName(), "seeded via API");

        // 2. Bridge the API session into the browser (the hybrid step).
        injectApiSession(auth);

        // 3. VERIFY through the real UI that the dashboard reflects the seeded data.
        DashboardPage dashboard = new DashboardPage().open();
        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load for the API-authenticated user");
        Assert.assertEquals(dashboard.waitForStatValue("Projects", "2"), "2",
                "Dashboard Projects KPI should reflect the two API-seeded projects");
    }
}
