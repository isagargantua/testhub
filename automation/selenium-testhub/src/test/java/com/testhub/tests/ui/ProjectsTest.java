package com.testhub.tests.ui;

import com.testhub.pages.ProjectDetailPage;
import com.testhub.pages.ProjectsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class ProjectsTest extends BaseTest {

    @BeforeMethod(alwaysRun = true)
    public void signIn() {
        loginAsTester();
    }

    @Test(groups = {"smoke", "projects"},
            description = "A project can be created and appears in the grid as ACTIVE")
    public void shouldCreateProject() {
        String name = TestDataFactory.projectName();
        ProjectsPage projects = new ProjectsPage().open()
                .createProject(name, TestDataFactory.sentence());

        Assert.assertTrue(projects.isProjectVisible(name), "New project should be visible");
        Assert.assertEquals(projects.getProjectStatus(name), "ACTIVE",
                "A new project defaults to ACTIVE");
    }

    @Test(groups = {"regression", "projects"},
            description = "A project can be created without a description")
    public void shouldCreateProjectWithoutDescription() {
        String name = TestDataFactory.projectName();
        ProjectsPage projects = new ProjectsPage().open().createProject(name, "");
        Assert.assertTrue(projects.isProjectVisible(name),
                "Project with no description should still be created");
    }

    @Test(groups = {"regression", "projects"},
            description = "Deleting a project (confirm dialog) removes it from the grid")
    public void shouldDeleteProject() {
        String name = TestDataFactory.projectName();
        ProjectsPage projects = new ProjectsPage().open()
                .createProject(name, TestDataFactory.sentence());
        Assert.assertTrue(projects.isProjectVisible(name), "Precondition: project exists");

        projects.deleteProject(name);
        Assert.assertFalse(projects.isProjectVisible(name), "Project should be gone after delete");
    }

    @Test(groups = {"regression", "projects"},
            description = "Opening a project card navigates to its suites view")
    public void shouldOpenProjectDetail() {
        String name = TestDataFactory.projectName();
        ProjectsPage projects = new ProjectsPage().open()
                .createProject(name, TestDataFactory.sentence());

        ProjectDetailPage detail = projects.openProject(name);
        Assert.assertTrue(detail.isLoaded(), "Project detail (Test Suites) should load");
    }
}
