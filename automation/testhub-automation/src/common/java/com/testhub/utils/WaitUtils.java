package com.testhub.utils;

import com.testhub.config.ConfigManager;
import com.testhub.driver.DriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.FluentWait;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;
import java.util.function.Function;

/**
 * Explicit-wait helpers. The whole framework waits explicitly — there are no
 * implicit waits or {@code Thread.sleep} calls in page objects, which keeps
 * tests both fast and stable against the cold-start backend.
 */
public final class WaitUtils {

    private WaitUtils() {
    }

    private static WebDriverWait newWait() {
        return new WebDriverWait(DriverManager.getDriver(), ConfigManager.explicitTimeout(),
                ConfigManager.pollingInterval());
    }

    private static WebDriverWait newWait(Duration timeout) {
        return new WebDriverWait(DriverManager.getDriver(), timeout, ConfigManager.pollingInterval());
    }

    public static WebElement waitForVisible(By locator) {
        return newWait().until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    public static WebElement waitForVisible(By locator, Duration timeout) {
        return newWait(timeout).until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    public static WebElement waitForClickable(By locator) {
        return newWait().until(ExpectedConditions.elementToBeClickable(locator));
    }

    public static WebElement waitForClickable(WebElement element) {
        return newWait().until(ExpectedConditions.elementToBeClickable(element));
    }

    public static WebElement waitForPresence(By locator) {
        return newWait().until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    public static List<WebElement> waitForAllVisible(By locator) {
        return newWait().until(ExpectedConditions.visibilityOfAllElementsLocatedBy(locator));
    }

    public static boolean waitForInvisible(By locator) {
        return newWait().until(ExpectedConditions.invisibilityOfElementLocated(locator));
    }

    public static boolean waitForTextPresent(By locator, String text) {
        return newWait().until(ExpectedConditions.textToBePresentInElementLocated(locator, text));
    }

    public static boolean waitForUrlContains(String fraction) {
        return newWait().until(ExpectedConditions.urlContains(fraction));
    }

    public static boolean waitForUrlToBe(String url) {
        return newWait().until(ExpectedConditions.urlToBe(url));
    }

    /** True if at least one element matching the locator is present right now (no wait). */
    public static boolean isPresent(By locator) {
        return !DriverManager.getDriver().findElements(locator).isEmpty();
    }

    /** Waits until the SPA has finished its async data load (no pending fetches + DOM ready). */
    public static void waitForPageReady() {
        Wait<WebDriver> fluentWait = new FluentWait<>(DriverManager.getDriver())
                .withTimeout(ConfigManager.pageLoadTimeout())
                .pollingEvery(ConfigManager.pollingInterval());
        fluentWait.until(documentReady());
    }

    private static Function<WebDriver, Boolean> documentReady() {
        return driver -> "complete".equals(
                ((JavascriptExecutor) driver).executeScript("return document.readyState"));
    }
}
