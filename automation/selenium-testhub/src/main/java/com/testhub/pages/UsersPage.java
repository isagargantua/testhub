package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.AlertUtils;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * Admin-only user management at {@code /users}: search, the reset-password
 * modal, and delete (guarded by a native confirm dialog).
 */
public class UsersPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Users']");
    private final By searchInput = By.cssSelector("input[placeholder='Search by name or email']");
    private final By searchButton = buttonByText("Search");
    private final By feedbackBanner = By.xpath("//div[contains(@class,'466451')]");
    private final By errorBanner = By.xpath("//div[contains(@class,'8b4335')]");
    private final By prevButton = buttonByText("Previous");
    private final By nextButton = buttonByText("Next");

    public UsersPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_USERS);
        waitUntilLoaded();
        return this;
    }

    public UsersPage waitUntilLoaded() {
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    public UsersPage search(String term) {
        type(searchInput, term);
        click(searchButton);
        waitForReady();
        return this;
    }

    public boolean isUserVisible(String email) {
        return isPresent(rowByEmail(email));
    }

    public String getRole(String email) {
        return getText(By.xpath(rowXpath(email) + "//span[contains(@class,'rounded-full')]"));
    }

    public UsersPage resetPassword(String email, String newPassword) {
        click(By.xpath(rowXpath(email) + "//button[normalize-space()='Reset password']"));
        modal().waitUntilOpen();
        type(fieldByLabel("New password"), newPassword);
        click(By.xpath("//div[contains(@class,'fixed') and contains(@class,'z-50')]" +
                "//button[contains(normalize-space(),'Reset password')]"));
        modal().waitUntilClosed();
        return this;
    }

    public UsersPage deleteUser(String email) {
        click(By.xpath(rowXpath(email) + "//button[contains(normalize-space(),'Delete')]"));
        AlertUtils.acceptAlert();
        WaitUtils.waitForInvisible(rowByEmail(email));
        return this;
    }

    /** Attempts delete but dismisses the confirm dialog — user must remain. */
    public UsersPage cancelDeleteUser(String email) {
        click(By.xpath(rowXpath(email) + "//button[contains(normalize-space(),'Delete')]"));
        AlertUtils.dismissAlert();
        return this;
    }

    public String getFeedback() {
        return getText(feedbackBanner);
    }

    public String getError() {
        return getText(errorBanner);
    }

    public boolean hasError() {
        return isPresent(errorBanner);
    }

    public void nextPage() {
        click(nextButton);
        waitForReady();
    }

    public void previousPage() {
        click(prevButton);
        waitForReady();
    }

    private String rowXpath(String email) {
        return "//tr[.//td[normalize-space()='" + email + "']]";
    }

    private By rowByEmail(String email) {
        return By.xpath(rowXpath(email));
    }
}
