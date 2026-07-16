package com.testhub.tests.ui;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.driver.DriverManager;
import com.testhub.pages.DashboardPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.WaitUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Pure-UI coverage of app navigation and role-based access: sidebar routing,
 * the admin-only Users link, logout, and the protected-route redirect for an
 * unauthenticated visitor.
 */
public class NavigationTest extends BaseTest {

    @Test(groups = {"regression", "navigation"},
            description = "The sidebar routes between the main sections")
    public void shouldNavigateViaSidebar() {
        DashboardPage dashboard = signInTester();

        dashboard.sidebar().goToProjects();
        Assert.assertTrue(WaitUtils.waitForUrlContains("/projects"), "Should be on Projects");

        dashboard.sidebar().goToTestCases();
        Assert.assertTrue(WaitUtils.waitForUrlContains("/test-cases"), "Should be on the Test Library");

        dashboard.sidebar().goToDashboard();
        Assert.assertTrue(WaitUtils.waitForUrlToBe(ConfigManager.baseUrl() + "/"),
                "Should be back on the Dashboard");
    }

    @Test(groups = {"smoke", "navigation", "rbac"},
            description = "A TESTER does not see the admin-only Users link")
    public void shouldHideUsersLinkFromTester() {
        DashboardPage dashboard = signInTester();
        Assert.assertEquals(dashboard.navbar().getRole(), "TESTER", "Standing account should be a TESTER");
        Assert.assertFalse(dashboard.sidebar().isUsersLinkVisible(),
                "A TESTER must not see the Users (admin) link");
    }

    @Test(groups = {"regression", "navigation"},
            description = "Logging out returns to the login screen")
    public void shouldLogOutToLogin() {
        signInTester().navbar().logout();
        Assert.assertTrue(currentUrl().contains("/login"), "Logout should land on /login");
    }

    @Test(groups = {"regression", "navigation", "rbac"},
            description = "An unauthenticated visitor is redirected to login from a protected route")
    public void shouldRedirectUnauthenticatedToLogin() {
        // Fresh browser (new driver per test) has no session — a protected route
        // must bounce to /login.
        DriverManager.getDriver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_DASHBOARD);
        Assert.assertTrue(WaitUtils.waitForUrlContains("/login"),
                "A protected route should redirect an anonymous user to /login");
    }

    private String currentUrl() {
        return DriverManager.getDriver().getCurrentUrl();
    }
}
