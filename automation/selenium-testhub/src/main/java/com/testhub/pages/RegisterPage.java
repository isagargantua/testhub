package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The account-creation screen. Fields have no test ids, so we locate them by
 * their visible labels (Name / Email / Password / Confirm password).
 */
public class RegisterPage extends BasePage {

    private final By nameInput = fieldByLabel("Name");
    private final By emailInput = fieldByLabel("Email");
    private final By passwordInput = fieldByLabel("Password");
    private final By confirmInput = fieldByLabel("Confirm password");
    private final By submitButton = buttonByText("Create Account");
    private final By errorBanner = By.xpath("//div[contains(@class,'8b4335')]");
    private final By loginLink = By.xpath("//a[normalize-space()='Log in']");

    public RegisterPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_REGISTER);
        WaitUtils.waitForVisible(nameInput);
        return this;
    }

    public RegisterPage enterName(String name) {
        type(nameInput, name);
        return this;
    }

    public RegisterPage enterEmail(String email) {
        type(emailInput, email);
        return this;
    }

    public RegisterPage enterPassword(String password) {
        type(passwordInput, password);
        return this;
    }

    public RegisterPage enterConfirmPassword(String password) {
        type(confirmInput, password);
        return this;
    }

    public void clickCreateAccount() {
        click(submitButton);
    }

    public void submit(String name, String email, String password, String confirmPassword) {
        enterName(name);
        enterEmail(email);
        enterPassword(password);
        enterConfirmPassword(confirmPassword);
        clickCreateAccount();
    }

    /** Happy-path registration — auto-confirms the password and waits for the dashboard. */
    public DashboardPage registerAndLogin(String name, String email, String password) {
        submit(name, email, password, password);
        WaitUtils.waitForUrlToBe(ConfigManager.baseUrl() + "/");
        return new DashboardPage().waitUntilLoaded();
    }

    public String getErrorMessage() {
        return getText(errorBanner);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(errorBanner);
    }

    public LoginPage goToLogin() {
        click(loginLink);
        return new LoginPage();
    }
}
