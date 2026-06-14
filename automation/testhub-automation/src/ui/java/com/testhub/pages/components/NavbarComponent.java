package com.testhub.pages.components;

import com.testhub.pages.BasePage;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/** Top bar: role chip, Help, Logout, theme toggle. */
public class NavbarComponent extends BasePage {

    private final By logoutButton = By.xpath("//button[normalize-space()='Logout']");
    private final By helpButton = By.xpath("//button[normalize-space()='Help']");
    private final By themeToggle = By.cssSelector("button[aria-label*='mode' i]");
    private final By roleChip = By.xpath("//span[contains(@class,'uppercase') and " +
            "(normalize-space()='ADMIN' or normalize-space()='TESTER' or normalize-space()='VIEWER')]");

    public void logout() {
        click(logoutButton);
        WaitUtils.waitForUrlContains("/login");
    }

    public void openHelp() {
        click(helpButton);
    }

    public String getRole() {
        return getText(roleChip);
    }

    public void toggleTheme() {
        if (isPresent(themeToggle)) {
            click(themeToggle);
        }
    }

    public boolean isLogoutVisible() {
        return isPresent(logoutButton);
    }
}
