package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.JavaScriptUtils;
import com.testhub.utils.WaitUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openqa.selenium.By;

/**
 * The sign-in screen. The login form exposes {@code data-testid} hooks, so we
 * prefer those — they survive copy/styling changes far better than CSS classes.
 */
public class LoginPage extends BasePage {

    private static final Logger log = LogManager.getLogger(LoginPage.class);


    private final By emailInput    = By.cssSelector("[data-testid='login-email']");
    private final By passwordInput = By.cssSelector("[data-testid='login-password']");
    private final By submitButton  = By.cssSelector("[data-testid='login-submit']");
    private final By wakeBtn       = By.cssSelector("[data-testid='wake-services']");
    private final By wakeStatus    = By.cssSelector("[data-testid='wake-status']");
    private final By errorBanner   = By.xpath("//div[contains(@class,'8b4335')]");
    private final By registerLink  = By.xpath("//a[normalize-space()='Create an account']");
    private final By heading       = By.xpath("//h2[normalize-space()='Welcome back']");

    public LoginPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_LOGIN);
        WaitUtils.waitForVisible(emailInput);
        return this;
    }

    /**
     * Clicks "Services asleep? Wake them" and waits up to 90 s for
     * "✅ All services are awake. You can sign in now." to appear.
     * Called by BaseTest.ensureServicesAwake() only when health checks confirm
     * at least one service is down.
     */
    public void wakeServicesAndWait() {
        if (!isDisplayed(wakeBtn)) {
            log.info("Wake-services button not visible — services may already be up");
            return;
        }
        log.info("Clicking 'Services asleep? Wake them'…");
        click(wakeBtn);

        long deadline = System.currentTimeMillis() + 90_000;
        while (System.currentTimeMillis() < deadline) {
            try {
                String status = getText(wakeStatus);
                if (status != null && status.contains("All services are awake")) {
                    log.info("✅ All services are awake — proceeding");
                    return;
                }
                log.info("  Waiting… status: {}", status);
            } catch (Exception ignored) {}
            try { Thread.sleep(3000); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        log.warn("Services may not be fully awake after 90 s — continuing anyway");
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

    public String getErrorMessage() {
        return getText(errorBanner);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(errorBanner);
    }

    public RegisterPage goToRegister() {
        click(registerLink);
        return new RegisterPage();
    }

    public void clickWakeServices() {
        click(wakeBtn);
    }

    public String getWakeStatus() {
        return getText(wakeStatus);
    }
}
