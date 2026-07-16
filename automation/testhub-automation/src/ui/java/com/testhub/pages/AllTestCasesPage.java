package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.WaitUtils;
import com.testhub.utils.XPathUtil;
import org.openqa.selenium.By;

/**
 * The "All Test Cases" library at {@code /test-cases}: every case across the
 * user's projects, with a title search, a project filter, CSV/JSON export, and
 * a live "Unique Test Cases" total. Cards render with the case title as an h2.
 */
public class AllTestCasesPage extends BaseAppPage {

    private final By heading      = By.xpath("//h1[normalize-space()='All Test Cases']");
    private final By searchInput  = By.cssSelector("input[type='search']");
    private final By projectFilter = By.cssSelector("select.input");
    private final By totalValue   = By.xpath("//div[contains(@class,'eyebrow') and normalize-space()='Unique Test Cases']" +
            "/following-sibling::div[contains(@class,'display-title')]");
    private final By emptyState   = By.xpath("//*[normalize-space()='No test cases found']");
    private final By exportCsv    = buttonByText("Export CSV");

    public AllTestCasesPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_TEST_CASES);
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Types into the title search. The list is debounced, so callers should
     *  wait on a concrete card/empty-state afterwards rather than reading instantly. */
    public AllTestCasesPage search(String title) {
        type(searchInput, title);
        return this;
    }

    public boolean isEmptyStateVisible() {
        return isDisplayed(emptyState);
    }

    public boolean isCaseVisible(String title) {
        return isPresent(caseCard(title));
    }

    /** Waits until a case card with the given title appears (absorbs debounce/fetch). */
    public AllTestCasesPage waitForCase(String title) {
        WaitUtils.waitForVisible(caseCard(title));
        return this;
    }

    public String getTotalCount() {
        return getText(totalValue);
    }

    public boolean isExportEnabled() {
        return WaitUtils.waitForPresence(exportCsv).isEnabled();
    }

    public AllTestCasesPage clickExportCsv() {
        click(exportCsv);
        return this;
    }

    private By caseCard(String title) {
        return By.xpath("//div[contains(@class,'card')][.//h2[normalize-space()="
                + XPathUtil.quote(title) + "]]");
    }
}
