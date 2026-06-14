package com.testhub.tests.e2e;

import com.testhub.enums.Priority;
import com.testhub.enums.ResultStatus;
import com.testhub.pages.DashboardPage;
import com.testhub.pages.ProjectDetailPage;
import com.testhub.pages.ProjectsPage;
import com.testhub.pages.RegisterPage;
import com.testhub.pages.RunDetailPage;
import com.testhub.pages.SuiteDetailPage;
import com.testhub.pages.TestRunsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * The canonical product journey, driven entirely through the UI — no API
 * shortcuts. This is the smoke test that proves the whole platform hangs
 * together: register → project → suite → case → run → result → dashboard.
 */
public class EndToEndWorkflowTest extends BaseTest {

    @Test(groups = {"smoke", "e2e"},
            description = "Full QA workflow from sign-up to a result reflected on the dashboard")
    public void fullQaWorkflow() {
        String name = TestDataFactory.fullName();
        String email = TestDataFactory.uniqueEmail();
        String password = TestDataFactory.password();
        String projectName = TestDataFactory.projectName();
        String suiteName = TestDataFactory.suiteName();
        String caseTitle = TestDataFactory.testCaseTitle();
        String runName = TestDataFactory.runName();

        // 1. Register a brand-new account.
        DashboardPage dashboard = new RegisterPage().open().registerAndLogin(name, email, password);
        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load after registration");

        // 2. Create a project.
        ProjectsPage projects = new ProjectsPage().open().createProject(projectName, "E2E project");
        ProjectDetailPage projectDetail = projects.openProject(projectName);
        String projectId = projectDetail.getProjectId();

        // 3. Create a suite, then a test case inside it.
        projectDetail.createSuite(suiteName, "E2E suite");
        SuiteDetailPage suite = projectDetail.openSuite(suiteName);
        suite.createTestCase(caseTitle, "E2E case", TestDataFactory.steps(),
                TestDataFactory.expected(), Priority.CRITICAL);
        Assert.assertTrue(suite.isTestCaseVisible(caseTitle), "Created case should be visible");

        // 4. Create a run that includes the new case.
        TestRunsPage runs = new TestRunsPage().open(projectId)
                .createRun(runName, "E2E run", java.util.List.of(caseTitle));
        Assert.assertTrue(runs.isRunVisible(runName), "Run should appear in the list");

        // 5. Mark the case PASS inside the run.
        RunDetailPage runDetail = runs.openRun(runName).markResult(caseTitle, ResultStatus.PASS);
        Assert.assertEquals(runDetail.getResultStatus(caseTitle), "PASS", "Case should be PASS");
        Assert.assertEquals(runDetail.getSummaryCount("PASS"), 1, "PASS summary should be 1");

        // 6. The dashboard should now reflect the activity.
        DashboardPage finalDashboard = new DashboardPage().open();
        Assert.assertEquals(finalDashboard.getStatValue("Projects"), "1", "One project exists");
        Assert.assertEquals(finalDashboard.getStatValue("Runs"), "1", "One run exists");
        Assert.assertEquals(finalDashboard.getStatValue("Pass Rate"), "100%",
                "A single PASS result means a 100% pass rate");
    }
}
