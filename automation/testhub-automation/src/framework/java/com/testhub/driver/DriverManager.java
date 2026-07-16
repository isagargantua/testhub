package com.testhub.driver;

import com.testhub.exceptions.FrameworkException;
import org.openqa.selenium.WebDriver;

/**
 * Thread-safe holder for the {@link WebDriver} of the currently executing test.
 *
 * <p>Each TestNG thread gets its own driver via {@link ThreadLocal}, which is
 * what makes parallel execution safe. Page objects and utilities pull the
 * driver from here rather than passing it around explicitly.
 */
public final class DriverManager {

    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    private DriverManager() {
    }

    public static WebDriver getDriver() {
        WebDriver driver = DRIVER.get();
        if (driver == null) {
            throw new FrameworkException(
                    "No WebDriver for the current thread. Was the driver created in @BeforeMethod?");
        }
        return driver;
    }

    static void setDriver(WebDriver driver) {
        DRIVER.set(driver);
    }

    public static boolean hasDriver() {
        return DRIVER.get() != null;
    }

    /** Quit the driver and detach it from the thread to avoid memory leaks. */
    public static void quitDriver() {
        WebDriver driver = DRIVER.get();
        if (driver != null) {
            try {
                driver.quit();
            } finally {
                DRIVER.remove();
            }
        }
    }
}
