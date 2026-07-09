package com.testhub.pages;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.utils.WaitUtils;
import com.testhub.utils.XPathUtil;
import org.openqa.selenium.By;

/**
 * Projects workspace — the grid of project cards plus the create-project modal.
 * Deleting a project opens the app's custom confirm dialog (see
 * {@link com.testhub.pages.components.ConfirmDialogComponent}); success and
 * error feedback surfaces as transient toasts, not inline banners.
 */
public class ProjectsPage extends BaseAppPage {

    private final By heading = By.xpath("//h1[normalize-space()='Projects']");
    private final By createProjectButton = buttonByText("Create Project");
    private final By modalSubmit = buttonByText("Create");
    private final By projectCard = By.cssSelector(".card-interactive");

    public ProjectsPage open() {
        driver().get(ConfigManager.baseUrl() + FrameworkConstants.ROUTE_PROJECTS);
        WaitUtils.waitForVisible(heading);
        waitForReady();
        return this;
    }

    public boolean isLoaded() {
        return isDisplayed(heading);
    }

    public ProjectsPage openCreateModal() {
        click(createProjectButton);
        modal().waitUntilOpen();
        return this;
    }

    /** End-to-end create through the UI; waits for the new card to render. */
    public ProjectsPage createProject(String name, String description) {
        openCreateModal();
        type(fieldByLabel("Name"), name);
        type(fieldByLabel("Description"), description);
        click(modalSubmit);
        modal().waitUntilClosed();
        WaitUtils.waitForVisible(cardByName(name));
        return this;
    }

    public boolean isProjectVisible(String name) {
        return isPresent(cardByName(name));
    }

    public ProjectDetailPage openProject(String name) {
        // Click the title rather than the card centre — parts of a card (e.g.
        // the delete control) intercept clicks instead of navigating.
        click(By.xpath(cardXpath(name) + "//h2"));
        return new ProjectDetailPage().waitUntilLoaded();
    }

    public String getProjectStatus(String name) {
        return getText(By.xpath(cardXpath(name) + "//span[contains(@class,'uppercase')]"));
    }

    /** Clicks Delete on a project card, confirms the dialog, waits for removal. */
    public ProjectsPage deleteProject(String name) {
        click(By.xpath(cardXpath(name) + "//button[contains(normalize-space(),'Delete')]"));
        confirmDialog().confirm();
        WaitUtils.waitForInvisible(cardByName(name));
        return this;
    }

    public int getProjectCount() {
        return findAll(projectCard).size();
    }

    // --- locator helpers -----------------------------------------------------

    private String cardXpath(String name) {
        return "//div[contains(@class,'card-interactive')][.//h2[normalize-space()="
                + XPathUtil.quote(name) + "]]";
    }

    private By cardByName(String name) {
        return By.xpath(cardXpath(name));
    }
}
