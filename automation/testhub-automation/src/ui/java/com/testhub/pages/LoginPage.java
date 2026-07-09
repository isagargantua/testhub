package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.JavaScriptUtils;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The sign-in screen. The login form exposes {@code data-testid} hooks, so we
 * prefer those — they survive copy/styling changes far better than CSS classes.
 * The error banner and wake-services flow are inherited from {@link AuthPage}.
 */
public class LoginPage extends AuthPage {

    private final By emailInput    = By.cssSelector("[data-testid='login-email']");
    private final By passwordInput = By.cssSelector("[data-testid='login-password']");
    private final By submitButton  = By.cssSelector("[data-testid='login-submit']");
    // The h1 is unique to the auth screens; the app navbar renders its own
    // "Welcome back" as an h2, so matching the tag matters here.
    private final By heading       = By.xpath("//h1[contains(@class,'lg-title') and normalize-space()='Welcome back']");
    private final By registerLink  = By.cssSelector("a[href='/register']");

    public LoginPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_LOGIN);
        WaitUtils.waitForVisible(emailInput);
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading) && isDisplayed(emailInput);
    }

    public LoginPage enterEmail(String email) {
        type(emailInput, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        type(passwordInput, password);
        return this;
    }

    public void clickSignIn() {
        click(submitButton);
    }

    /** Fills both fields and submits — does not assert the outcome. */
    public void submitLogin(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        clickSignIn();
    }

    /** Happy-path login that waits for the dashboard route. */
    public DashboardPage loginAs(String email, String password) {
        submitLogin(email, password);
        WaitUtils.waitForUrlToBe(ConfigManager.baseUrl() + "/");
        return new DashboardPage().waitUntilLoaded();
    }

    /**
     * True when the browser's native HTML5 validation rejects the email field
     * (e.g. a malformed address in the {@code type="email"} input). In that case
     * the form never submits, so no app error banner can appear.
     */
    public boolean isEmailRejectedByBrowser() {
        Object valid = JavaScriptUtils.execute("return arguments[0].checkValidity();",
                WaitUtils.waitForVisible(emailInput));
        return Boolean.FALSE.equals(valid);
    }

    public RegisterPage goToRegister() {
        click(registerLink);
        return new RegisterPage();
    }
}
