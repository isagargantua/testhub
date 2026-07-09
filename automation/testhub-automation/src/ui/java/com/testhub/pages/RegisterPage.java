package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The account-creation screen. Every field and the submit button expose
 * {@code data-testid} hooks — locate by those, never by label position or
 * button copy (both changed in the last redesign and will change again).
 * The error banner and wake-services flow are inherited from {@link AuthPage}.
 */
public class RegisterPage extends AuthPage {

    private final By nameInput    = By.cssSelector("[data-testid='register-name']");
    private final By emailInput   = By.cssSelector("[data-testid='register-email']");
    private final By passwordInput = By.cssSelector("[data-testid='register-password']");
    private final By confirmInput = By.cssSelector("[data-testid='register-confirm']");
    private final By submitButton = By.cssSelector("[data-testid='register-submit']");
    private final By loginLink    = By.cssSelector("a[href='/login']");

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

    public LoginPage goToLogin() {
        click(loginLink);
        return new LoginPage();
    }
}
