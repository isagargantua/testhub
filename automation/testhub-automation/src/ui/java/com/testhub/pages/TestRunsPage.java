package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.enums.RunStatus;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

import java.util.List;

/**
 * Test Runs list for a project at {@code /projects/:id/runs}, including the
 * two-step "Create Run" wizard (details → choose test cases).
 */
public class TestRunsPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Test Runs']");
    private final By createRunButton = buttonByText("Create Run");
    private final By nextStepButton = By.xpath("//button[contains(normalize-space(),'Next: Choose Test Cases')]");
    private final By createRunSubmit = By.xpath("//button[contains(normalize-space(),'Create Run (')]");

    public TestRunsPage open(String projectId) {
        driver().get(ConfigManager.baseUrl() + "/projects/" + projectId + "/runs");
        waitUntilLoaded();
        return this;
    }

    public TestRunsPage waitUntilLoaded() {
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Full wizard: enter details, advance, tick the given case titles, submit. */
    public TestRunsPage createRun(String name, String description, List<String> caseTitles) {
        click(createRunButton);
        modal().waitUntilOpen();

        // Step 1 — details
        type(fieldByLabel("Name"), name);
        type(fieldByLabel("Description"), description);
        click(nextStepButton);

        // Step 2 — choose cases
        for (String title : caseTitles) {
            selectCaseByTitle(title);
        }
        click(createRunSubmit);
        modal().waitUntilClosed();
        WaitUtils.waitForVisible(runCard(name));
        return this;
    }

    public void selectCaseByTitle(String title) {
        By checkbox = By.xpath("//label[.//span[normalize-space()='" + title + "']]//input[@type='checkbox']");
        click(checkbox);
    }

    public boolean isRunVisible(String name) {
        return isPresent(runCard(name));
    }

    public RunDetailPage openRun(String name) {
        click(runCard(name));
        return new RunDetailPage();
    }

    public TestRunsPage setRunStatus(String runName, RunStatus status) {
        By statusSelect = By.xpath(runXpath(runName) + "//select");
        selectByValue(statusSelect, status.name());
        return this;
    }

    public String getRunStatusBadge(String runName) {
        return getText(By.xpath(runXpath(runName) + "//span[contains(@class,'badge') or " +
                "contains(@class,'rounded-full')][1]"));
    }

    public TestRunsPage deleteRun(String runName) {
        click(By.xpath(runXpath(runName) + "//button[contains(normalize-space(),'Delete')]"));
        WaitUtils.waitForInvisible(runCard(runName));
        return this;
    }

    private String runXpath(String name) {
        return "//div[contains(@class,'card-interactive')][.//h2[normalize-space()='" + name + "']]";
    }

    private By runCard(String name) {
        return By.xpath(runXpath(name));
    }
}
