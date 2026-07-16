package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.pages.components.ModalComponent;
import com.testhub.utils.WaitUtils;
import com.testhub.utils.XPathUtil;
import org.openqa.selenium.By;

/**
 * The admin-only Users screen at {@code /users}: a searchable table of accounts
 * with per-row Reset-password / Delete actions, plus the checkbox column that
 * drives multi-select bulk delete (select-all in the header, a "Delete
 * selected (n)" action bar, and the shared confirm dialog).
 */
public class UsersPage extends BaseAppPage {

    private final By heading        = By.xpath("//h1[normalize-space()='Users']");
    private final By searchInput    = By.cssSelector("input[placeholder='Search by name or email']");
    private final By searchButton   = buttonByText("Search");
    private final By selectAllBox    = By.cssSelector("[data-testid='select-all-users']");
    private final By bulkActionBar   = By.cssSelector("[data-testid='bulk-action-bar']");
    private final By bulkDeleteButton = By.cssSelector("[data-testid='bulk-delete']");
    private final By rows           = By.cssSelector("tbody tr");
    // The row action and the modal submit share the text "Reset password", so
    // scope the submit to the open modal overlay.
    private final By resetSubmit    = By.xpath(ModalComponent.SCOPE
            + "//button[normalize-space()='Reset password']");

    public UsersPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_USERS);
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Filters the table to rows matching the query (name or email). */
    public UsersPage searchFor(String query) {
        type(searchInput, query);
        click(searchButton);
        waitForReady();
        return this;
    }

    /** Instant presence check — use for negative assertions after a delete
     *  (delete already waited for the row to disappear). */
    public boolean isUserVisible(String email) {
        return isPresent(rowByEmail(email));
    }

    /**
     * Waits (up to the explicit timeout) for a user's row to appear, then reports
     * whether it did. Use for positive assertions after a search: the search form
     * reloads the table asynchronously, so an instant check can race the fetch.
     */
    public boolean isUserListed(String email) {
        try {
            WaitUtils.waitForVisible(rowByEmail(email));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Deletes a single user via its row Delete button + the confirm dialog. */
    public UsersPage deleteUser(String email) {
        WaitUtils.waitForVisible(rowByEmail(email));
        click(By.xpath(rowXpath(email) + "//button[normalize-space()='Delete']"));
        confirmDialog().confirm();
        WaitUtils.waitForInvisible(rowByEmail(email));
        return this;
    }

    /** Ticks the checkbox for one user (no-op safe if already selected). */
    public UsersPage selectUser(String email) {
        By box = By.xpath(rowXpath(email) + "//input[@data-testid='select-user']");
        WaitUtils.waitForClickable(box);
        if (!WaitUtils.waitForPresence(box).isSelected()) {
            click(box);
        }
        return this;
    }

    /** Header select-all — ticks every deletable row on the current page. */
    public UsersPage selectAll() {
        click(selectAllBox);
        return this;
    }

    public boolean isBulkBarVisible() {
        return isDisplayed(bulkActionBar);
    }

    public String getBulkBarText() {
        return getText(bulkActionBar);
    }

    public int getSelectedCount() {
        return findAll(By.cssSelector("[data-testid='select-user']:checked")).size();
    }

    /** Clicks "Delete selected (n)" and confirms the dialog. */
    public UsersPage bulkDeleteSelected() {
        click(bulkDeleteButton);
        confirmDialog().confirm();
        WaitUtils.waitForInvisible(bulkActionBar);
        return this;
    }

    /** Opens a user's Reset-password modal, sets a new password, submits. */
    public UsersPage resetPassword(String email, String newPassword) {
        WaitUtils.waitForVisible(rowByEmail(email));
        click(By.xpath(rowXpath(email) + "//button[normalize-space()='Reset password']"));
        modal().waitUntilOpen();
        type(fieldByLabel("New password"), newPassword);
        click(resetSubmit);
        modal().waitUntilClosed();
        return this;
    }

    public int getVisibleUserCount() {
        return findAll(rows).size();
    }

    // --- locator helpers -----------------------------------------------------

    private String rowXpath(String email) {
        return "//tbody/tr[.//td[normalize-space()=" + XPathUtil.quote(email) + "]]";
    }

    private By rowByEmail(String email) {
        return By.xpath(rowXpath(email));
    }
}
