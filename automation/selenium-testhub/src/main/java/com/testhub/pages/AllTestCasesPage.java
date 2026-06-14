package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The cross-project test-case library at {@code /test-cases}: search, project
 * filter, the "Unique Test Cases" counter, and CSV/JSON export.
 */
public class AllTestCasesPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='All Test Cases']");
    private final By searchInput = By.cssSelector("input[type='search']");
    private final By projectFilter = By.cssSelector("select.input");
    private final By exportCsvButton = By.xpath("//button[contains(normalize-space(),'Export CSV')]");
    private final By exportJsonButton = By.xpath("//button[contains(normalize-space(),'Export JSON')]");
    private final By uniqueCount = By.xpath("//div[normalize-space()='Unique Test Cases']" +
            "/following-sibling::div[contains(@class,'display-title')]");
    private final By caseCardTitle = By.xpath("//h2[contains(@class,'display-title')]");
    private final By emptyState = By.xpath("//h2[normalize-space()='No test cases found']");

    public AllTestCasesPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_TEST_CASES);
        waitUntilLoaded();
        return this;
    }

    public AllTestCasesPage waitUntilLoaded() {
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Search is debounced (~350ms) in the app; the explicit waits absorb that. */
    public AllTestCasesPage search(String term) {
        type(searchInput, term);
        waitForReady();
        return this;
    }

    public AllTestCasesPage filterByProject(String projectName) {
        selectByVisibleText(projectFilter, projectName);
        waitForReady();
        return this;
    }

    public boolean isCaseVisible(String title) {
        return isPresent(By.xpath("//h2[normalize-space()='" + title + "']"));
    }

    public int getVisibleCount() {
        return findAll(caseCardTitle).size();
    }

    public String getUniqueCount() {
        return getText(uniqueCount);
    }

    public boolean isEmptyStateShown() {
        return isPresent(emptyState);
    }

    public void clickExportCsv() {
        click(exportCsvButton);
    }

    public void clickExportJson() {
        click(exportJsonButton);
    }
}
