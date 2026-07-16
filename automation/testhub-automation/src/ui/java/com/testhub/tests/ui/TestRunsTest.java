package com.testhub.tests.ui;

import com.testhub.pages.TestRunsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.List;

/**
 * Pure-UI coverage of the Test Runs list ({@code /projects/:id/runs}), including
 * the two-step create-run wizard and the delete path — neither of which the E2E
 * journey exercises on its own.
 */
public class TestRunsTest extends BaseTest {

    @Test(groups = {"regression", "runs"},
            description = "A run can be created through the wizard and then deleted")
    public void shouldCreateAndDeleteRun() {
        signInTester();

        String caseTitle = TestDataFactory.testCaseTitle();
        String projectId = seedProjectSuiteCase(
                TestDataFactory.projectName(), TestDataFactory.suiteName(), caseTitle);

        String runName = TestDataFactory.runName();
        TestRunsPage runs = new TestRunsPage().open(projectId)
                .createRun(runName, TestDataFactory.sentence(), List.of(caseTitle));
        Assert.assertTrue(runs.isRunVisible(runName), "New run should appear in the list");

        runs.deleteRun(runName);
        Assert.assertFalse(runs.isRunVisible(runName), "Run should be gone after delete");
    }
}
