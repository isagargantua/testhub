package com.testhub.tests.ui;

import com.testhub.pages.DashboardPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.JavaScriptUtils;
import com.testhub.utils.WaitUtils;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class ThemeTest extends BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void signIn() {
        loginAsTester();
    }

    @Test(groups = {"regression", "theme"},
            description = "Toggling the theme flips data-theme and persists across a reload")
    public void shouldToggleAndPersistTheme() {
        DashboardPage dashboard = new DashboardPage();
        String before = currentTheme();

        dashboard.navbar().toggleTheme();
        WaitUtils.waitForPageReady();
        String after = currentTheme();
        Assert.assertNotEquals(after, before, "data-theme should change after toggling");

        // Reload and confirm the choice stuck (it's stored in localStorage).
        com.testhub.driver.DriverManager.getDriver().navigate().refresh();
        new DashboardPage().waitUntilLoaded();
        Assert.assertEquals(currentTheme(), after, "Theme choice should persist across reload");
    }

    private String currentTheme() {
        Object value = JavaScriptUtils.execute(
                "return document.documentElement.getAttribute('data-theme');");
        return value == null ? "light" : value.toString();
    }
}
