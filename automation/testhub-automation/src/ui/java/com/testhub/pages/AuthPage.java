package com.testhub.pages;

import com.testhub.config.ConfigManager;
import org.openqa.selenium.By;

import java.time.Duration;

/**
 * Shared base for the two unauthenticated screens (login and register). Both
 * render the same error banner ({@code .lg-error}) and the same
 * "Services asleep? Wake them" control ({@code data-testid} hooks), so the
 * cold-start wake-up flow lives here in exactly one place.
 */
public abstract class AuthPage extends BasePage {

    protected final By errorBanner = By.cssSelector(".lg-error[role='alert']");
    private final By wakeBtn = By.cssSelector("[data-testid='wake-services']");
    private final By wakeStatus = By.cssSelector("[data-testid='wake-status']");

    public String getErrorMessage() {
        return getText(errorBanner);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(errorBanner);
    }

    public void clickWakeServices() {
        click(wakeBtn);
    }

    public String getWakeStatus() {
        return getText(wakeStatus);
    }

    /**
     * Clicks "Services asleep? Wake them" and polls the on-page status until
     * "All services are awake" appears (bounded by {@code wake.timeout.seconds},
     * default 90 s). Best-effort: logs a warning and continues on timeout so a
     * slow-but-recovering backend doesn't hard-fail the whole suite here.
     */
    public void wakeServicesAndWait() {
        if (!isPresent(wakeBtn)) {
            log.info("Wake-services button not present — skipping wake-up");
            return;
        }
        log.info("Clicking 'Services asleep? Wake them'…");
        click(wakeBtn);

        Duration timeout = ConfigManager.wakeTimeout();
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        while (System.currentTimeMillis() < deadline) {
            String status = isPresent(wakeStatus) ? getText(wakeStatus) : "";
            if (status.contains("All services are awake")) {
                log.info("All services are awake — proceeding");
                return;
            }
            log.info("  Waiting for services… status: {}", status.isBlank() ? "(pending)" : status);
            try {
                Thread.sleep(3000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        log.warn("Services may not be fully awake after {} s — continuing anyway", timeout.toSeconds());
    }
}
