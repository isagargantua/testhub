package com.testhub.utils;

import com.testhub.driver.DriverManager;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;

/** Thin wrapper over {@link JavascriptExecutor} for the handful of cases where
 *  a native interaction is flaky (overlays, custom scroll containers, etc.). */
public final class JavaScriptUtils {

    private JavaScriptUtils() {
    }

    private static JavascriptExecutor js() {
        return (JavascriptExecutor) DriverManager.getDriver();
    }

    public static Object execute(String script, Object... args) {
        return js().executeScript(script, args);
    }

    public static void clickWithJs(WebElement element) {
        js().executeScript("arguments[0].click();", element);
    }

    public static void scrollIntoView(WebElement element) {
        js().executeScript("arguments[0].scrollIntoView({block:'center'});", element);
    }

    public static void scrollToBottom() {
        js().executeScript("window.scrollTo(0, document.body.scrollHeight);");
    }

    public static void setLocalStorage(String key, String value) {
        js().executeScript("window.localStorage.setItem(arguments[0], arguments[1]);", key, value);
    }

    public static String getLocalStorage(String key) {
        Object value = js().executeScript("return window.localStorage.getItem(arguments[0]);", key);
        return value == null ? null : value.toString();
    }

    public static void clearLocalStorage() {
        js().executeScript("window.localStorage.clear();");
    }
}
