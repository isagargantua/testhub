package com.testhub.tests.ui;

import com.testhub.enums.Priority;
import com.testhub.pages.ProjectDetailPage;
import com.testhub.pages.ProjectsPage;
import com.testhub.pages.SuiteDetailPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Pure-UI coverage of a suite's Test Cases view ({@code /suites/:id}). The E2E
 * journey only creates a case; this adds the delete path and a priority
 * round-trip assertion. Every action is driven through the browser.
 */
public class SuiteDetailTest extends BaseTest {

    @Test(groups = {"regression", "suites", "testcases"},
            description = "A test case can be created in a suite and then deleted from it")
    public void shouldCreateAndDeleteTestCase() {
        signInTester();

        // Build the project + suite through the UI.
        String projectName = TestDataFactory.projectName();
        String suiteName = TestDataFactory.suiteName();
        ProjectsPage projects = new ProjectsPage().open()
                .createProject(projectName, TestDataFactory.sentence());
        ProjectDetailPage detail = projects.openProject(projectName);
        detail.createSuite(suiteName, TestDataFactory.sentence());
        SuiteDetailPage suite = detail.openSuite(suiteName);

        // Create a case and verify it lands with the right priority.
        String caseTitle = TestDataFactory.testCaseTitle();
        suite.createTestCase(caseTitle, TestDataFactory.sentence(),
                TestDataFactory.steps(), TestDataFactory.expected(), Priority.CRITICAL);
        Assert.assertTrue(suite.isTestCaseVisible(caseTitle), "Created case should be visible");
        Assert.assertEquals(suite.getPriority(caseTitle), "CRITICAL", "Priority should round-trip");

        // Delete it and verify it's gone.
        suite.deleteTestCase(caseTitle);
        Assert.assertFalse(suite.isTestCaseVisible(caseTitle), "Case should be gone after delete");
    }
}
