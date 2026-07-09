package com.testhub.tests.api;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.config.ConfigManager;
import com.testhub.exceptions.FrameworkException;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

public class AuthApiTest extends ApiBaseTest {

    @Test(groups = {"api", "smoke"},
            description = "Registration returns a user plus access and refresh tokens")
    public void registrationReturnsTokens() {
        AuthResponse auth = api().register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
        Assert.assertNotNull(auth.accessToken, "Access token expected");
        Assert.assertNotNull(auth.refreshToken, "Refresh token expected");
        Assert.assertEquals(auth.user.role, "TESTER", "Self-registered user is a TESTER");
    }

    @Test(groups = {"api", "smoke"},
            description = "An existing user can log in and receive a token")
    public void loginSucceedsWithValidCredentials() {
        // Uses the standing tester account: login needs no fresh registration,
        // and skipping register avoids the live free-tier throttle entirely.
        String email = ConfigManager.testerEmail();
        AuthResponse auth = new ApiClient().login(email, ConfigManager.testerPassword());
        Assert.assertNotNull(auth.accessToken, "Login should return an access token");
        Assert.assertEquals(auth.user.email, email.toLowerCase(), "Returned email should match");
    }

    @Test(groups = {"api", "regression"},
            description = "Login with a wrong password is rejected with 401")
    public void loginFailsWithWrongPassword() {
        FrameworkException ex = Assert.expectThrows(FrameworkException.class,
                () -> new ApiClient().login(ConfigManager.testerEmail(), "WrongPassword123"));
        Assert.assertTrue(ex.getMessage().contains("401"), "Should fail with HTTP 401");
    }

    @Test(groups = {"api", "regression"},
            description = "Registering the same email twice is rejected")
    public void duplicateRegistrationIsRejected() {
        String email = TestDataFactory.uniqueEmail();
        api().register(TestDataFactory.fullName(), email, TestDataFactory.password());

        FrameworkException ex = Assert.expectThrows(FrameworkException.class,
                () -> api().register(TestDataFactory.fullName(), email, TestDataFactory.password()));
        Assert.assertTrue(ex.getMessage().contains("400"), "Duplicate register should fail with 400");
    }
}
