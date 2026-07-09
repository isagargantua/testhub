package com.testhub.pages.components;

import com.testhub.pages.BasePage;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The shared create/edit dialog used across Projects, Suites, Test Cases, Runs
 * and Users. Only one modal is ever open at a time, so label-scoped field
 * lookups from {@link BasePage} resolve unambiguously to the dialog.
 */
public class ModalComponent extends BasePage {

    /** XPath prefix that scopes a locator to the open modal overlay. */
    public static final String SCOPE = "//div[contains(@class,'fixed') and contains(@class,'z-50')]";

    private final By modalRoot = By.xpath(SCOPE + "//div[contains(@class,'card')]");
    private final By title = By.xpath(SCOPE + "//h2");
    private final By closeButton = buttonByText("Close");

    public boolean isOpen() {
        return isDisplayed(modalRoot);
    }

    public String getTitle() {
        return getText(title);
    }

    public void close() {
        click(closeButton);
        WaitUtils.waitForInvisible(modalRoot);
    }

    public void waitUntilOpen() {
        WaitUtils.waitForVisible(modalRoot);
    }

    public void waitUntilClosed() {
        WaitUtils.waitForInvisible(modalRoot);
    }
}
