package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.enums.Role;
import com.testhub.pages.UsersPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.SkipException;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Admin user-management. Requires the configured {@code admin.*} account to be
 * a real ADMIN. If it isn't (e.g. running against a shared DB where the first
 * user was someone else), these tests skip rather than fail noisily.
 */
public class UsersTest extends BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void signInAsAdmin() {
        AuthResponse admin = loginAsAdmin();
        if (!Role.ADMIN.name().equals(admin.user.role)) {
            throw new SkipException("Configured account is not ADMIN — skipping admin-only tests");
        }
    }

    @Test(groups = {"smoke", "admin", "users"},
            description = "The users table loads and can find a user by search")
    public void shouldSearchForUser() {
        AuthResponse victim = api().register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());

        UsersPage users = new UsersPage().open().search(victim.user.email);
        Assert.assertTrue(users.isUserVisible(victim.user.email),
                "Searched user should appear in the table");
        Assert.assertEquals(users.getRole(victim.user.email), "TESTER",
                "A self-registered user is a TESTER");
    }

    @Test(groups = {"regression", "admin", "users"},
            description = "An admin can reset another user's password to a known value")
    public void shouldResetUserPassword() {
        AuthResponse victim = api().register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
        String newPassword = "Reset@99999";

        UsersPage users = new UsersPage().open().search(victim.user.email);
        users.resetPassword(victim.user.email, newPassword);
        Assert.assertTrue(users.getFeedback().toLowerCase().contains("reset"),
                "A confirmation message should be shown");

        // Prove the reset actually took effect by logging in with the new password.
        AuthResponse relogin = new ApiClient().login(victim.user.email, newPassword);
        Assert.assertNotNull(relogin.accessToken, "Login with the new password should succeed");
    }

    @Test(groups = {"regression", "admin", "users"},
            description = "An admin can delete a user after confirming the dialog")
    public void shouldDeleteUser() {
        AuthResponse victim = api().register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());

        UsersPage users = new UsersPage().open().search(victim.user.email);
        Assert.assertTrue(users.isUserVisible(victim.user.email), "Precondition: user listed");
        users.deleteUser(victim.user.email);
        Assert.assertFalse(users.isUserVisible(victim.user.email), "User should be gone after delete");
    }

    @Test(groups = {"regression", "admin", "users"},
            description = "Dismissing the delete confirm keeps the user")
    public void shouldKeepUserWhenDeleteCancelled() {
        AuthResponse victim = api().register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());

        UsersPage users = new UsersPage().open().search(victim.user.email);
        users.cancelDeleteUser(victim.user.email);
        Assert.assertTrue(users.isUserVisible(victim.user.email),
                "User should remain after cancelling the delete");
    }
}
