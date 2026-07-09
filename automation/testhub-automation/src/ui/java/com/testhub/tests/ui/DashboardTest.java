package com.testhub.tests.ui;

import com.testhub.pages.DashboardPage;
import com.testhub.tests.BaseTest;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Pure-UI dashboard check. The user signs up through the form, so the dashboard
 * is verified for a genuinely fresh account (all KPIs at zero). Data-seeded
 * dashboard assertions live in the hybrid test (which seeds over the API).
 */
public class DashboardTest extends BaseTest {

    @Test(groups = {"smoke", "dashboard"},
            description = "A brand-new user's dashboard renders the KPI cards at zero")
    public void shouldRenderKpiCardsForNewUser() {
        DashboardPage dashboard = signUpFreshUser();

        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load");
        Assert.assertEquals(dashboard.waitForStatValue("Projects", "0"), "0", "No projects yet");
        Assert.assertEquals(dashboard.waitForStatValue("Runs", "0"), "0", "No runs yet");
    }
}
