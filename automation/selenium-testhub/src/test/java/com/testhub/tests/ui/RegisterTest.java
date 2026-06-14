package com.testhub.tests.ui;

import com.testhub.pages.DashboardPage;
import com.testhub.pages.RegisterPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

public class RegisterTest extends BaseTest {

    @Test(groups = {"smoke", "auth"},
            description = "A new account can be created and is signed in immediately")
    public void shouldRegisterNewAccount() {
        RegisterPage register = new RegisterPage().open();
        DashboardPage dashboard = register.registerAndLogin(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
        Assert.assertTrue(dashboard.isLoaded(), "Should land on the dashboard after registering");
    }

    @Test(groups = {"regression", "auth"},
            description = "Mismatched passwords are blocked client-side")
    public void shouldRejectMismatchedPasswords() {
        RegisterPage register = new RegisterPage().open();
        register.submit(TestDataFactory.fullName(), TestDataFactory.uniqueEmail(),
                "Password123", "Different123");
        Assert.assertTrue(register.isErrorDisplayed(), "An error should be shown");
        Assert.assertTrue(register.getErrorMessage().toLowerCase().contains("do not match"),
                "Error should mention the passwords do not match");
    }

    @Test(groups = {"regression", "auth"},
            description = "Passwords shorter than 6 characters are rejected")
    public void shouldRejectShortPassword() {
        RegisterPage register = new RegisterPage().open();
        register.submit(TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), "123", "123");
        Assert.assertTrue(register.getErrorMessage().toLowerCase().contains("at least 6"),
                "Error should mention the 6-character minimum");
    }

    @Test(groups = {"regression", "auth"},
            description = "A missing name is rejected")
    public void shouldRequireName() {
        RegisterPage register = new RegisterPage().open();
        String pwd = TestDataFactory.password();
        register.submit("", TestDataFactory.uniqueEmail(), pwd, pwd);
        Assert.assertTrue(register.getErrorMessage().toLowerCase().contains("name is required"),
                "Error should mention the name is required");
    }

    @Test(groups = {"regression", "auth"},
            description = "The 'Log in' link routes back to sign-in")
    public void shouldNavigateBackToLogin() {
        new RegisterPage().open().goToLogin();
        Assert.assertTrue(com.testhub.driver.DriverManager.getDriver()
                .getCurrentUrl().contains("/login"), "Should be on the login route");
    }
}
