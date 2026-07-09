package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * A single project's Test Suites view, reached at {@code /projects/:id}. Suites
 * are deleted directly (no confirm dialog here).
 */
public class ProjectDetailPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Test Suites']");
    private final By createSuiteButton = buttonByText("Create Suite");
    private final By viewRunsButton = buttonByText("View Runs");
    private final By modalSubmit = buttonByText("Create");

    public ProjectDetailPage open(String projectId) {
        driver().get(ConfigManager.baseUrl() + "/projects/" + projectId);
        waitUntilLoaded();
        return this;
    }

    public ProjectDetailPage waitUntilLoaded() {
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Extracts the project id from the current {@code /projects/:id} URL. */
    public String getProjectId() {
        String url = driver().getCurrentUrl();
        String marker = "/projects/";
        String tail = url.substring(url.indexOf(marker) + marker.length());
        int slash = tail.indexOf('/');
        return slash >= 0 ? tail.substring(0, slash) : tail;
    }

    public ProjectDetailPage createSuite(String name, String description) {
        click(createSuiteButton);
        modal().waitUntilOpen();
        type(fieldByLabel("Name"), name);
        type(fieldByLabel("Description"), description);
        click(modalSubmit);
        modal().waitUntilClosed();
        WaitUtils.waitForVisible(suiteCard(name));
        return this;
    }

    public boolean isSuiteVisible(String name) {
        return isPresent(suiteCard(name));
    }

    public SuiteDetailPage openSuite(String name) {
        // Click the title rather than the card centre — see ProjectsPage.openProject.
        click(By.xpath(suiteXpath(name) + "//h2"));
        return new SuiteDetailPage().waitUntilLoaded();
    }

    public ProjectDetailPage deleteSuite(String name) {
        click(By.xpath(suiteXpath(name) + "//button[contains(normalize-space(),'Delete')]"));
        WaitUtils.waitForInvisible(suiteCard(name));
        return this;
    }

    public TestRunsPage goToRuns() {
        click(viewRunsButton);
        return new TestRunsPage();
    }

    private String suiteXpath(String name) {
        return "//div[contains(@class,'card-interactive')][.//h2[normalize-space()="
                + com.testhub.utils.XPathUtil.quote(name) + "]]";
    }

    private By suiteCard(String name) {
        return By.xpath(suiteXpath(name));
    }
}
