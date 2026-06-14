package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.enums.Priority;
import com.testhub.enums.RunStatus;
import com.testhub.pages.TestRunsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.util.List;

public class TestRunTest extends BaseTest {

    private String projectId;
    private TestCaseDto case1;
    private TestCaseDto case2;

    @BeforeMethod(alwaysRun = true)
    public void seedDataAndSignIn() {
        ApiClient api = loginAsTester();
        ProjectDto project = api.createProject(TestDataFactory.projectName(), "seed");
        SuiteDto suite = api.createSuite(project.id, TestDataFactory.suiteName(), "seed");
        this.projectId = project.id;
        this.case1 = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.HIGH);
        this.case2 = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.LOW);
    }

    @Test(groups = {"smoke", "runs"},
            description = "A run is created via the two-step wizard, selecting specific cases")
    public void shouldCreateRunWithSelectedCases() {
        String runName = TestDataFactory.runName();
        TestRunsPage runs = new TestRunsPage().open(projectId)
                .createRun(runName, TestDataFactory.sentence(), List.of(case1.title, case2.title));
        Assert.assertTrue(runs.isRunVisible(runName), "New run should appear in the list");
    }

    @Test(groups = {"regression", "runs"},
            description = "A run's status can be changed from its card")
    public void shouldChangeRunStatusFromCard() {
        String runName = TestDataFactory.runName();
        TestRunsPage runs = new TestRunsPage().open(projectId)
                .createRun(runName, "", List.of(case1.title));
        runs.setRunStatus(runName, RunStatus.COMPLETED);
        Assert.assertEquals(runs.getRunStatusBadge(runName), "COMPLETED",
                "Card badge should reflect the new status");
    }

    @Test(groups = {"regression", "runs"},
            description = "A run can be deleted")
    public void shouldDeleteRun() {
        String runName = TestDataFactory.runName();
        TestRunsPage runs = new TestRunsPage().open(projectId)
                .createRun(runName, "", List.of(case1.title));
        runs.deleteRun(runName);
        Assert.assertFalse(runs.isRunVisible(runName), "Run should be removed after delete");
    }
}
