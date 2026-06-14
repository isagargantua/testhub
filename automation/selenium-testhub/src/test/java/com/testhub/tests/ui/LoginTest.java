package com.testhub.tests.ui;

import com.testhub.pages.DashboardPage;
import com.testhub.pages.LoginPage;
import com.testhub.pages.RegisterPage;
import com.testhub.tests.BaseTest;
import com.testhub.tests.data.DataProviders;
import com.testhub.tests.data.LoginData;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

public class LoginTest extends BaseTest {

    @Test(groups = {"smoke", "auth"},
            description = "Valid credentials sign the user in and land on the dashboard")
    public void shouldLoginWithValidCredentials() {
        // Seed a known account over the API, then exercise the real login form.
        String email = TestDataFactory.uniqueEmail();
        String password = TestDataFactory.password();
        api().register(TestDataFactory.fullName(), email, password);

        DashboardPage dashboard = openLoginPage().loginAs(email, password);

        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load after valid login");
        Assert.assertEquals(dashboard.navbar().getRole(), "TESTER",
                "A self-registered (non-first) user should be a TESTER");
    }

    @Test(groups = {"regression", "auth"}, dataProvider = "invalidLogins",
            dataProviderClass = DataProviders.class,
            description = "Invalid credentials are rejected with an error and no redirect")
    public void shouldRejectInvalidLogins(LoginData data) {
        LoginPage login = openLoginPage();
        login.submitLogin(data.email, data.password);

        Assert.assertTrue(login.isErrorDisplayed(),
                "An error banner should appear for: " + data.scenario);
        Assert.assertTrue(driverUrlContainsLogin(),
                "User should remain on /login for: " + data.scenario);
        if (data.expectedError != null && !data.expectedError.isBlank()) {
            Assert.assertTrue(login.getErrorMessage().contains(data.expectedError),
                    "Error should mention '" + data.expectedError + "' but was: " + login.getErrorMessage());
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
            description = "The cold-start 'Wake them' control is available on the login screen")
    public void shouldExposeWakeServicesControl() {
        LoginPage login = openLoginPage();
        Assert.assertTrue(login.isLoaded(), "Login page should be loaded");
        // The wake-services button is a documented automation hook.
        login.clickWakeServices();
        Assert.assertFalse(login.getWakeStatus().isBlank(),
                "Clicking wake should surface a status message");
    }

    @Test(groups = {"regression", "auth"},
            description = "The 'Create an account' link routes to the registration screen")
    public void shouldNavigateToRegister() {
        RegisterPage register = openLoginPage().goToRegister();
        Assert.assertTrue(driverUrlContains("/register"), "Should be on the register route");
    }

    // --- small URL helpers ---------------------------------------------------

    private boolean driverUrlContainsLogin() {
        return driverUrlContains("/login");
    }

    private boolean driverUrlContains(String fraction) {
        return com.testhub.driver.DriverManager.getDriver().getCurrentUrl().contains(fraction);
    }
}
