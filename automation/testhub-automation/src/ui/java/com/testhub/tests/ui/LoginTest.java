package com.testhub.tests.ui;

import com.testhub.config.ConfigManager;
import com.testhub.driver.DriverManager;
import com.testhub.pages.DashboardPage;
import com.testhub.pages.LoginPage;
import com.testhub.tests.BaseTest;
import com.testhub.tests.data.DataProviders;
import com.testhub.tests.data.LoginData;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Pure-UI authentication tests — every action goes through the real browser
 * forms. Nothing here touches the API.
 */
public class LoginTest extends BaseTest {

    @Test(groups = {"smoke", "auth"},
            description = "Valid credentials sign the user in through the login form")
    public void shouldLoginWithValidCredentials() {
        DashboardPage dashboard;
        if (ConfigManager.reuseUser()) {
            // Sign in as the standing tester account — pure form login, no registration.
            dashboard = openLoginPage()
                    .loginAs(ConfigManager.testerEmail(), ConfigManager.testerPassword());
        } else {
            // Create a real account through the UI, sign out, then sign back in via
            // the login form — the whole flow stays 100% UI, with no API seeding.
            String email = TestDataFactory.uniqueEmail();
            String password = TestDataFactory.password();
            openRegisterPage()
                    .registerAndLogin(TestDataFactory.fullName(), email, password)
                    .navbar().logout();
            dashboard = openLoginPage().loginAs(email, password);
        }

        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load after valid login");
        Assert.assertEquals(dashboard.navbar().getRole(), "TESTER",
                "The signed-in (non-admin) user should be a TESTER");
    }

    @Test(groups = {"regression", "auth"}, dataProvider = "invalidLogins",
            dataProviderClass = DataProviders.class,
            description = "Invalid credentials are rejected with an error and no redirect")
    public void shouldRejectInvalidLogins(LoginData data) {
        LoginPage login = openLoginPage();
        login.submitLogin(data.email, data.password);

        Assert.assertTrue(urlContains("/login"),
                "User should remain on /login for: " + data.scenario);
        if (data.expectedError != null && !data.expectedError.isBlank()) {
            // Server-rejected credentials surface the app's error banner.
            Assert.assertTrue(login.isErrorDisplayed(),
                    "An error banner should appear for: " + data.scenario);
            Assert.assertTrue(login.getErrorMessage().contains(data.expectedError),
                    "Error should mention '" + data.expectedError + "' but was: " + login.getErrorMessage());
        } else {
            // No expected message ⇒ rejection is client-side: the type="email" input's
            // native HTML5 validation blocks the submit, so no app banner renders.
            Assert.assertTrue(login.isEmailRejectedByBrowser() || login.isErrorDisplayed(),
                    "Login should be rejected client-side or via banner for: " + data.scenario);
        }
    }

    @Test(groups = {"regression", "auth"},
            description = "Submitting empty credentials shows a validation error")
    public void shouldShowErrorForEmptyCredentials() {
        LoginPage login = openLoginPage();
        login.clickSignIn();
        Assert.assertTrue(login.isErrorDisplayed(), "Empty submit should surface an error");
    }

    @Test(groups = {"regression", "auth"},
            description = "The 'Create an account' link routes to the registration screen")
    public void shouldNavigateToRegister() {
        openLoginPage().goToRegister();
        Assert.assertTrue(urlContains("/register"), "Should be on the register route");
    }

    private boolean urlContains(String fraction) {
        return DriverManager.getDriver().getCurrentUrl().contains(fraction);
    }
}
