package com.testhub.pages.components;

import com.testhub.pages.BasePage;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The app's custom confirmation dialog (rendered by {@code ConfirmDialog.jsx}
 * with {@code role="alertdialog"}). Destructive actions — deleting a project
 * or a user — go through this dialog, <b>not</b> a native {@code window.confirm},
 * so tests confirm here rather than via Selenium's alert API.
 */
public class ConfirmDialogComponent extends BasePage {

    private final By dialog = By.cssSelector("div[role='alertdialog']");
    private final By confirmButton = By.cssSelector("div[role='alertdialog'] button.btn");
    private final By cancelButton = By.cssSelector("div[role='alertdialog'] button.btn-secondary");
    private final By title = By.cssSelector("div[role='alertdialog'] h2");

    public boolean isOpen() {
        return isPresent(dialog);
    }

    public void waitUntilOpen() {
        WaitUtils.waitForVisible(dialog);
    }

    public String getTitle() {
        return getText(title);
    }

    /** Clicks the primary (confirm/Delete) button and waits for the dialog to close. */
    public void confirm() {
        waitUntilOpen();
        click(confirmButton);
        WaitUtils.waitForInvisible(dialog);
    }

    /** Clicks Cancel and waits for the dialog to close. */
    public void cancel() {
        waitUntilOpen();
        click(cancelButton);
        WaitUtils.waitForInvisible(dialog);
    }
}
