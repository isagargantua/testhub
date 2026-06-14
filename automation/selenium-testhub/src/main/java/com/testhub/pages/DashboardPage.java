package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.enums.ResultStatus;
import com.testhub.utils.WaitUtils;
import org.openqa.selenium.By;

/**
 * The landing dashboard: KPI stat cards, the result-breakdown donut/legend, and
 * recent runs. Stat values are read by their card title's sibling number.
 */
public class DashboardPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Dashboard']");
    private final By recentRunsHeading = By.xpath("//h2[normalize-space()='Recent Runs']");
    private final By refreshButton = By.xpath("//button[contains(normalize-space(),'Refresh')]");

    public DashboardPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_DASHBOARD);
        waitUntilLoaded();
        return this;
    }

    public DashboardPage waitUntilLoaded() {
        // The "Dashboard" heading only renders once the stats fetch resolves, so
        // allow the longer page-load budget to absorb a cold core-service.
        WaitUtils.waitForVisible(heading, ConfigManager.pageLoadTimeout());
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    /** Reads a KPI stat card value by its title (Projects / Test Cases / Runs / Pass Rate).
     *  In {@code StatsCard} the value is the sibling that follows the eyebrow title. */
    public String getStatValue(String title) {
        By value = By.xpath("//div[contains(@class,'eyebrow') and normalize-space()='" + title + "']" +
                "/following-sibling::div[contains(@class,'display-title')]");
        return getText(value);
    }

    /** Clicks a status chip in the Result Breakdown legend (PASS/FAIL/SKIP/BLOCKED). */
    public DashboardPage filterByResult(ResultStatus status) {
        By chip = By.xpath("//button[.//span[normalize-space()='" + status.name() + "']]");
        click(chip);
        return this;
    }

    public boolean isResultFilterPanelVisible(ResultStatus status) {
        By panelHeading = By.xpath("//h2[normalize-space()='" + status.name() + " test cases']");
        return isDisplayed(panelHeading);
    }

    public DashboardPage refresh() {
        click(refreshButton);
        return this;
    }

    public boolean hasRecentRuns() {
        return isPresent(recentRunsHeading);
    }
}
