package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.enums.Priority;
import com.testhub.pages.components.ModalComponent;
import com.testhub.utils.WaitUtils;
import com.testhub.utils.XPathUtil;
import org.openqa.selenium.By;

/**
 * A suite's Test Cases view at {@code /suites/:id}: list of case cards plus the
 * five-field create-case modal (title, description, steps, expected, priority).
 */
public class SuiteDetailPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Test Cases']");
    private final By createCaseButton = buttonByText("Create Test Case");
    // The modal submit shares its text with the page-level button, so scope it
    // to the open modal overlay.
    private final By modalSubmit = By.xpath(ModalComponent.SCOPE
            + "//button[contains(normalize-space(),'Create Test Case')]");

    public SuiteDetailPage open(String suiteId) {
        driver().get(ConfigManager.baseUrl() + "/suites/" + suiteId);
        waitUntilLoaded();
        return this;
    }

    public SuiteDetailPage waitUntilLoaded() {
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    public SuiteDetailPage createTestCase(String title, String description, String steps,
                                          String expected, Priority priority) {
        click(createCaseButton);
        modal().waitUntilOpen();
        type(fieldByLabel("Title"), title);
        type(fieldByLabel("Description"), description);
        type(fieldByLabel("Steps"), steps);
        type(fieldByLabel("Expected Result"), expected);
        selectByValue(fieldByLabel("Priority"), priority.name());
        click(modalSubmit);
        modal().waitUntilClosed();
        WaitUtils.waitForVisible(caseCard(title));
        return this;
    }

    public boolean isTestCaseVisible(String title) {
        return isPresent(caseCard(title));
    }

    public String getPriority(String title) {
        return getText(By.xpath(caseXpath(title) + "//span[contains(@class,'badge') or " +
                "contains(@class,'rounded-full')][1]"));
    }

    public SuiteDetailPage deleteTestCase(String title) {
        click(By.xpath(caseXpath(title) + "//button[contains(normalize-space(),'Delete')]"));
        WaitUtils.waitForInvisible(caseCard(title));
        return this;
    }

    public int getVisibleCaseCount() {
        return findAll(By.xpath("//div[contains(@class,'card')][.//div[normalize-space()='Test Case']]")).size();
    }

    private String caseXpath(String title) {
        return "//div[contains(@class,'card')][.//h2[normalize-space()="
                + XPathUtil.quote(title) + "]]";
    }

    private By caseCard(String title) {
        return By.xpath(caseXpath(title));
    }
}
