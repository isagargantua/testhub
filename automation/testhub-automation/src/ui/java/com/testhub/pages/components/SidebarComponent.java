package com.testhub.pages.components;

import com.testhub.pages.BasePage;
import org.openqa.selenium.By;

/**
 * The left navigation rail (and its mobile drawer). Links render as anchors with
 * stable hrefs, so we locate by href rather than by the (duplicated, responsive)
 * label text.
 */
public class SidebarComponent extends BasePage {

    private final By dashboardLink = By.cssSelector("a[href='/']");
    private final By projectsLink = By.cssSelector("a[href='/projects']");
    private final By testCasesLink = By.cssSelector("a[href='/test-cases']");
    private final By usersLink = By.cssSelector("a[href='/users']");
    private final By apiDocsLink = By.xpath("//a[contains(@href,'/docs')]");
    private final By quickNewProject = By.xpath("//button[normalize-space()='+ New Project']");

    public void goToDashboard() {
        click(dashboardLink);
    }

    public void goToProjects() {
        click(projectsLink);
    }

    public void goToTestCases() {
        click(testCasesLink);
    }

    public void goToUsers() {
        click(usersLink);
    }

    public boolean isUsersLinkVisible() {
        return isPresent(usersLink);
    }

    public boolean isApiDocsLinkVisible() {
        return isPresent(apiDocsLink);
    }

    public void clickQuickNewProject() {
        click(quickNewProject);
    }
}
