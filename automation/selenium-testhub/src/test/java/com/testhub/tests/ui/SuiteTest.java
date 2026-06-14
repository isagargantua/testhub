package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.pages.ProjectDetailPage;
import com.testhub.pages.SuiteDetailPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Suite CRUD. The owning project is seeded over the API (the "hybrid" pattern):
 * we don't re-test project creation here — we jump straight to the suite flow.
 */
public class SuiteTest extends BaseTest {

    private String projectId;

    @BeforeMethod(alwaysRun = true)
    public void seedProjectAndSignIn() {
        ApiClient api = loginAsTester();
        ProjectDto project = api.createProject(TestDataFactory.projectName(), "seed");
        this.projectId = project.id;
    }

    @Test(groups = {"smoke", "suites"},
            description = "A suite can be created inside a project")
    public void shouldCreateSuite() {
        String suiteName = TestDataFactory.suiteName();
        ProjectDetailPage detail = new ProjectDetailPage().open(projectId)
                .createSuite(suiteName, TestDataFactory.sentence());
        Assert.assertTrue(detail.isSuiteVisible(suiteName), "New suite should be visible");
    }

    @Test(groups = {"regression", "suites"},
            description = "Opening a suite navigates to its test-cases view")
    public void shouldOpenSuiteDetail() {
        String suiteName = TestDataFactory.suiteName();
        ProjectDetailPage detail = new ProjectDetailPage().open(projectId)
                .createSuite(suiteName, TestDataFactory.sentence());
        SuiteDetailPage suite = detail.openSuite(suiteName);
        Assert.assertTrue(suite.isLoaded(), "Suite detail (Test Cases) should load");
    }

    @Test(groups = {"regression", "suites"},
            description = "A suite can be deleted")
    public void shouldDeleteSuite() {
        String suiteName = TestDataFactory.suiteName();
        ProjectDetailPage detail = new ProjectDetailPage().open(projectId)
                .createSuite(suiteName, TestDataFactory.sentence());
        detail.deleteSuite(suiteName);
        Assert.assertFalse(detail.isSuiteVisible(suiteName), "Suite should be removed after delete");
    }
}
