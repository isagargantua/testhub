package com.testhub.tests.ui;

import com.testhub.driver.DriverManager;
import com.testhub.pages.DashboardPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.JavaScriptUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.Objects;

/**
 * Pure-UI coverage of the light/dark theme toggle. The theme is written to the
 * {@code <html data-theme>} attribute and persisted to localStorage, so a
 * toggle must both flip the attribute and survive a page reload.
 */
public class ThemeTest extends BaseTest {

    @Test(groups = {"regression", "theme"},
            description = "Toggling the theme flips data-theme and persists across a reload")
    public void shouldToggleAndPersistTheme() {
        DashboardPage dashboard = signInTester();

        String before = htmlTheme();
        Assert.assertNotNull(before, "The <html> element should carry a data-theme");

        dashboard.navbar().toggleTheme();
        waitForThemeChange(before);

        String after = htmlTheme();
        Assert.assertNotEquals(after, before, "Toggling should flip the theme");

        // Reload and confirm the choice persisted (localStorage-backed).
        DriverManager.getDriver().navigate().refresh();
        new DashboardPage().waitUntilLoaded();
        Assert.assertEquals(htmlTheme(), after, "Theme should persist across a reload");
    }

    private String htmlTheme() {
        Object value = JavaScriptUtils.execute(
                "return document.documentElement.getAttribute('data-theme');");
        return value == null ? null : value.toString();
    }

    /** Polls until the theme attribute differs from {@code from} (bounded). */
    private void waitForThemeChange(String from) {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            if (!Objects.equals(htmlTheme(), from)) {
                return;
            }
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }
}
