package com.testhub.utils;

import com.testhub.config.ConfigManager;
import com.testhub.driver.DriverManager;
import org.openqa.selenium.Alert;
import org.openqa.selenium.NoAlertPresentException;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

/**
 * Native browser dialog handling. testHub deletes <b>projects</b> and
 * <b>users</b> via {@code window.confirm()}, so those flows must accept the JS
 * confirm dialog — which Selenium exposes as an {@link Alert}.
 */
public final class AlertUtils {

    private AlertUtils() {
    }

    public static Alert waitForAlert() {
        return new WebDriverWait(DriverManager.getDriver(), ConfigManager.explicitTimeout())
                .until(ExpectedConditions.alertIsPresent());
    }

    public static String acceptAlert() {
        Alert alert = waitForAlert();
        String text = alert.getText();
        alert.accept();
        return text;
    }

    public static String dismissAlert() {
        Alert alert = waitForAlert();
        String text = alert.getText();
        alert.dismiss();
        return text;
    }

    public static boolean isAlertPresent() {
        try {
            DriverManager.getDriver().switchTo().alert();
            return true;
        } catch (NoAlertPresentException e) {
            return false;
        }
    }
}
