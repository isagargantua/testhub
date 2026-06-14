package com.testhub.tests.ui;

import com.testhub.config.ConfigManager;
import com.testhub.driver.DriverManager;
import com.testhub.pages.AllTestCasesPage;
import com.testhub.pages.DashboardPage;
import com.testhub.pages.ProjectsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.WaitUtils;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class NavigationTest extends BaseTest {

    private DashboardPage dashboard;

    @BeforeMethod(alwaysRun = true)
    public void signIn() {
        loginAsTester();
        dashboard = new DashboardPage().waitUntilLoaded();
    }

    @Test(groups = {"smoke", "navigation"},
            description = "The sidebar links route between the main sections")
    public void shouldNavigateViaSidebar() {
        dashboard.sidebar().goToProjects();
        Assert.assertTrue(new ProjectsPage().isLoaded(), "Projects page should load");

        dashboard.sidebar().goToTestCases();
        Assert.assertTrue(new AllTestCasesPage().isLoaded(), "Test Cases library should load");

        dashboard.sidebar().goToDashboard();
        Assert.assertTrue(new DashboardPage().isLoaded(), "Dashboard should load");
    }

    @Test(groups = {"regression", "navigation", "rbac"},
            description = "A TESTER does not see the admin-only Users and API Docs links")
    public void testerShouldNotSeeAdminLinks() {
        Assert.assertFalse(dashboard.sidebar().isUsersLinkVisible(),
                "Users link must be hidden from non-admins");
        Assert.assertFalse(dashboard.sidebar().isApiDocsLinkVisible(),
                "API Docs link must be hidden from non-admins");
    }

    @Test(groups = {"smoke", "navigation"},
            description = "Logout returns to the login screen")
    public void shouldLogout() {
        dashboard.navbar().logout();
        Assert.assertTrue(DriverManager.getDriver().getCurrentUrl().contains("/login"),
                "Logout should land on /login");
    }

    @Test(groups = {"regression", "navigation", "rbac"},
            description = "Visiting a protected route without a session redirects to login")
    public void shouldRedirectProtectedRouteWhenLoggedOut() {
        dashboard.navbar().logout();
        DriverManager.getDriver().get(ConfigManager.baseUrl() + "/projects");
        WaitUtils.waitForUrlContains("/login");
        Assert.assertTrue(DriverManager.getDriver().getCurrentUrl().contains("/login"),
                "Protected route should redirect an anonymous user to /login");
    }
}
