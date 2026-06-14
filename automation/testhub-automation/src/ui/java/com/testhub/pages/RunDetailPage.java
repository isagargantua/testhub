package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.enums.ResultStatus;
import com.testhub.enums.RunStatus;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * A single run at {@code /runs/:id}: the PASS/FAIL/SKIP/BLOCKED summary cards,
 * the progress bar, and per-test-case result buttons.
 */
public class RunDetailPage extends BaseAppPage {

    private final By runStatusSelect = By.xpath("//div[.//div[normalize-space()='Run Status']]//select");
    private final By addCasesButton = By.xpath("//button[contains(normalize-space(),'Add Test Cases')]");
    private final By backToRuns = By.xpath("//button[normalize-space()='← Back to Runs']");

    public RunDetailPage open(String runId) {
        driver().get(ConfigManager.baseUrl() + "/runs/" + runId);
        waitUntilLoaded();
        return this;
    }

    public RunDetailPage waitUntilLoaded() {
        WaitUtils.waitForVisible(runStatusSelect);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isPresent(runStatusSelect);
    }

    /** Marks a test case (by its title) with a result and waits for the badge to update. */
    public RunDetailPage markResult(String testCaseTitle, ResultStatus status) {
        By button = By.xpath(caseXpath(testCaseTitle) +
                "//button[normalize-space()='" + status.name() + "']");
        click(button);
        WaitUtils.waitForTextPresent(
                By.xpath(caseXpath(testCaseTitle) + "//span[contains(@class,'rounded-full') or " +
                        "contains(@class,'badge')][last()]"), status.name());
        return this;
    }

    public String getResultStatus(String testCaseTitle) {
        By statusBadge = By.xpath(caseXpath(testCaseTitle) +
                "//span[normalize-space()='PASS' or normalize-space()='FAIL' or " +
                "normalize-space()='SKIP' or normalize-space()='BLOCKED' or normalize-space()='PENDING']");
        return getText(statusBadge);
    }

    /** Reads a summary tile count (PASS / FAIL / SKIP / BLOCKED / PENDING). */
    public int getSummaryCount(String key) {
        By count = By.xpath("//div[contains(@class,'card')][.//div[normalize-space()='" + key + "']]" +
                "//div[contains(@class,'display-title')]");
        return Integer.parseInt(getText(count));
    }

    public RunDetailPage setRunStatus(RunStatus status) {
        selectByValue(runStatusSelect, status.name());
        return this;
    }

    public String getRunStatus() {
        return getValue(runStatusSelect);
    }

    public RunDetailPage openAddCasesModal() {
        click(addCasesButton);
        modal().waitUntilOpen();
        return this;
    }

    public RunDetailPage addCaseByTitle(String title) {
        By checkbox = By.xpath("//div[contains(@class,'fixed') and contains(@class,'z-50')]" +
                "//label[.//span[normalize-space()='" + title + "']]//input[@type='checkbox']");
        click(checkbox);
        click(By.xpath("//button[contains(normalize-space(),'Add ') and contains(normalize-space(),'Test Case')]"));
        modal().waitUntilClosed();
        WaitUtils.waitForVisible(caseCard(title));
        return this;
    }

    public TestRunsPage goBackToRuns() {
        click(backToRuns);
        return new TestRunsPage();
    }

    private String caseXpath(String title) {
        return "//div[contains(@class,'card')][.//h2[normalize-space()='" + title + "']]";
    }

    private By caseCard(String title) {
        return By.xpath(caseXpath(title));
    }
}
