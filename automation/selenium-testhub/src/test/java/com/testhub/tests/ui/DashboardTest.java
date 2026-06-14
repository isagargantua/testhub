package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.RunDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.enums.Priority;
import com.testhub.enums.ResultStatus;
import com.testhub.pages.DashboardPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.util.List;

public class DashboardTest extends BaseTest {

    private ApiClient api;

    @BeforeMethod(alwaysRun = true)
    public void signIn() {
        ensureServicesAwake();
        api = new ApiClient();
        AuthResponse auth = api.register(
                TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
        injectSession(auth);
    }

    @Test(groups = {"smoke", "dashboard"},
            description = "A fresh user's dashboard renders all four KPI cards at zero")
    public void shouldRenderKpiCards() {
        DashboardPage dashboard = new DashboardPage().open();
        Assert.assertTrue(dashboard.isLoaded(), "Dashboard should load");
        Assert.assertEquals(dashboard.getStatValue("Projects"), "0", "No projects yet");
        Assert.assertEquals(dashboard.getStatValue("Runs"), "0", "No runs yet");
    }

    @Test(groups = {"regression", "dashboard"},
            description = "KPI counts reflect data created over the API")
    public void shouldReflectSeededProjectsInKpi() {
        api.createProject(TestDataFactory.projectName(), "seed");
        api.createProject(TestDataFactory.projectName(), "seed");

        DashboardPage dashboard = new DashboardPage().open();
        Assert.assertEquals(dashboard.getStatValue("Projects"), "2",
                "Projects KPI should match the two seeded projects");
    }

    @Test(groups = {"regression", "dashboard"},
            description = "Clicking a Result Breakdown status reveals matching test cases")
    public void shouldFilterResultBreakdownByStatus() {
        // Seed a full graph and mark one case PASS so the breakdown has data.
        ProjectDto project = api.createProject(TestDataFactory.projectName(), "seed");
        SuiteDto suite = api.createSuite(project.id, TestDataFactory.suiteName(), "seed");
        TestCaseDto tc = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.HIGH);
        RunDto run = api.createRun(project.id, TestDataFactory.runName(), List.of(tc.id));
        api.markResult(run.id, tc.id, ResultStatus.PASS);

        DashboardPage dashboard = new DashboardPage().open().filterByResult(ResultStatus.PASS);
        Assert.assertTrue(dashboard.isResultFilterPanelVisible(ResultStatus.PASS),
                "The PASS test-cases panel should be shown");
    }
}
