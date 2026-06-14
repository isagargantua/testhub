package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.enums.Priority;
import com.testhub.pages.SuiteDetailPage;
import com.testhub.tests.BaseTest;
import com.testhub.tests.data.DataProviders;
import com.testhub.tests.data.TestCaseData;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

/**
 * Test-case CRUD inside a seeded suite. Demonstrates two data-driven styles:
 * a JSON-backed provider ({@code testCases}) and an enum provider
 * ({@code priorities}).
 */
public class TestCaseTest extends BaseTest {

    private String suiteId;

    @BeforeMethod(alwaysRun = true)
    public void seedSuiteAndSignIn() {
        ApiClient api = loginAsTester();
        ProjectDto project = api.createProject(TestDataFactory.projectName(), "seed");
        SuiteDto suite = api.createSuite(project.id, TestDataFactory.suiteName(), "seed");
        this.suiteId = suite.id;
    }

    @Test(groups = {"smoke", "testcases"}, dataProvider = "testCases",
            dataProviderClass = DataProviders.class,
            description = "Test cases from JSON data are created with the right priority")
    public void shouldCreateTestCaseFromData(TestCaseData data) {
        SuiteDetailPage suite = new SuiteDetailPage().open(suiteId)
                .createTestCase(data.title, data.description, data.steps, data.expected, data.priorityEnum());
        Assert.assertTrue(suite.isTestCaseVisible(data.title), "Case should be visible: " + data.title);
        Assert.assertEquals(suite.getPriority(data.title), data.priority,
                "Priority badge should match the data row");
    }

    @Test(groups = {"regression", "testcases"}, dataProvider = "priorities",
            dataProviderClass = DataProviders.class,
            description = "Every supported priority can be selected when creating a case")
    public void shouldSupportAllPriorities(Priority priority) {
        String title = TestDataFactory.testCaseTitle();
        SuiteDetailPage suite = new SuiteDetailPage().open(suiteId)
                .createTestCase(title, "desc", TestDataFactory.steps(), TestDataFactory.expected(), priority);
        Assert.assertEquals(suite.getPriority(title), priority.name(),
                "Badge should reflect the chosen priority");
    }

    @Test(groups = {"regression", "testcases"},
            description = "A test case can be deleted from its suite")
    public void shouldDeleteTestCase() {
        String title = TestDataFactory.testCaseTitle();
        SuiteDetailPage suite = new SuiteDetailPage().open(suiteId)
                .createTestCase(title, "desc", TestDataFactory.steps(), TestDataFactory.expected(),
                        Priority.MEDIUM);
        suite.deleteTestCase(title);
        Assert.assertFalse(suite.isTestCaseVisible(title), "Case should be removed after delete");
    }
}
