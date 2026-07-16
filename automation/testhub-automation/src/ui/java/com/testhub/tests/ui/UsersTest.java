package com.testhub.tests.ui;

import com.testhub.pages.DashboardPage;
import com.testhub.pages.UsersPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.SkipException;
import org.testng.annotations.Test;

/**
 * Pure-UI coverage of the admin Users screen. Every account these tests manage
 * is created through the real <b>register form</b> (never the API), then the
 * test signs back in as the admin to search, reset, and delete it — so the
 * whole flow stays 100% UI. Each test cleans up the throwaway accounts it makes.
 *
 * <p>All tests self-skip when the configured account isn't actually an ADMIN
 * (the Users route is admin-only).
 */
public class UsersTest extends BaseTest {

    @Test(groups = {"regression", "users"},
            description = "Admin deletes a single user through the row action + confirm dialog")
    public void shouldDeleteSingleUser() {
        String email = registerThrowawayUser();

        UsersPage users = openUsersAsAdmin().searchFor(email);
        Assert.assertTrue(users.isUserListed(email), "Precondition: the new user is listed");

        users.deleteUser(email);
        Assert.assertFalse(users.isUserVisible(email), "User should be gone after delete");
    }

    @Test(groups = {"regression", "users"},
            description = "Admin can filter the user table by email")
    public void shouldSearchUserByEmail() {
        String email = registerThrowawayUser();

        UsersPage users = openUsersAsAdmin().searchFor(email);
        Assert.assertTrue(users.isUserListed(email), "Searched user should appear");
        Assert.assertEquals(users.getVisibleUserCount(), 1, "Only the matching user should show");

        users.deleteUser(email); // cleanup
    }

    @Test(groups = {"regression", "users"},
            description = "Admin bulk-deletes multiple users selected by their row checkboxes")
    public void shouldBulkDeleteSelectedUsers() {
        String first = registerThrowawayUser();
        String second = registerThrowawayUser();

        UsersPage users = openUsersAsAdmin();
        users.selectUser(first).selectUser(second);

        Assert.assertTrue(users.isBulkBarVisible(), "The bulk action bar should appear once rows are selected");
        Assert.assertEquals(users.getSelectedCount(), 2, "Both users should be selected");

        users.bulkDeleteSelected();
        Assert.assertFalse(users.isUserVisible(first), "First user should be gone");
        Assert.assertFalse(users.isUserVisible(second), "Second user should be gone");
    }

    @Test(groups = {"regression", "users"},
            description = "Select-all ticks the filtered rows and drives a confirmed bulk delete")
    public void shouldSelectAllAndBulkDelete() {
        String email = registerThrowawayUser();

        // Narrow the table to just this account first, so select-all can't touch
        // anyone else's data.
        UsersPage users = openUsersAsAdmin().searchFor(email);
        Assert.assertTrue(users.isUserListed(email), "Precondition: filtered user is listed");
        users.selectAll();

        Assert.assertTrue(users.isBulkBarVisible(), "Action bar should appear after select-all");
        Assert.assertEquals(users.getSelectedCount(), 1, "Select-all should tick the one filtered row");

        users.bulkDeleteSelected();
        Assert.assertFalse(users.isUserVisible(email), "User should be gone after select-all bulk delete");
    }

    @Test(groups = {"regression", "users"},
            description = "Admin resets a user's password; the user can then sign in with it")
    public void shouldResetUserPassword() {
        String email = registerThrowawayUser();
        String newPassword = "Reset@2026";

        UsersPage users = openUsersAsAdmin().searchFor(email);
        users.resetPassword(email, newPassword);

        // Prove the reset worked by signing in as that user with the NEW password
        // through the real login form (still pure UI).
        users.navbar().logout();
        DashboardPage asUser = openLoginPage().loginAs(email, newPassword);
        Assert.assertTrue(asUser.isLoaded(), "User should sign in with the reset password");

        // Clean up: back to admin, remove the throwaway account.
        asUser.navbar().logout();
        openUsersAsAdmin().searchFor(email).deleteUser(email);
    }

    // --- helpers -------------------------------------------------------------

    /**
     * Creates a fresh TESTER through the sign-up form (which signs in as them),
     * then logs out. Returns the new account's email. 100% UI — no API.
     */
    private String registerThrowawayUser() {
        String email = TestDataFactory.uniqueEmail();
        openRegisterPage()
                .registerAndLogin(TestDataFactory.fullName(), email, TestDataFactory.password())
                .navbar().logout();
        return email;
    }

    /** Signs in as the configured admin and opens Users; skips if not an ADMIN. */
    private UsersPage openUsersAsAdmin() {
        DashboardPage dashboard = loginAsAdmin();
        if (!"ADMIN".equals(dashboard.navbar().getRole())) {
            throw new SkipException("Configured account is not an ADMIN — skipping Users tests");
        }
        return new UsersPage().open();
    }
}
