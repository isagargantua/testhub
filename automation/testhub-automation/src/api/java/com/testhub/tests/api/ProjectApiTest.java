package com.testhub.tests.api;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.enums.Priority;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

/**
 * Direct API coverage of the core domain graph (project → suite → case). These
 * also exercise the very seeding helpers the UI tests rely on, so a regression
 * in the API layer is caught here first.
 *
 * <p>One fresh user is registered per class, not per method — every test works
 * on its own uniquely-named project, so they can't collide, and keeping the
 * register count low matters against the throttled live free tier.
 */
public class ProjectApiTest extends ApiBaseTest {

    private ApiClient client;

    @BeforeClass(alwaysRun = true)
    public void authenticate() {
        client = new ApiClient();
        client.register(TestDataFactory.fullName(), TestDataFactory.uniqueEmail(), TestDataFactory.password());
    }

    @Test(groups = {"api", "smoke"},
            description = "Creating a project returns an id and defaults to ACTIVE")
    public void createProjectReturnsActiveProject() {
        ProjectDto project = client.createProject(TestDataFactory.projectName(), "via api");
        Assert.assertNotNull(project.id, "Project id expected");
        Assert.assertEquals(project.status, "ACTIVE", "New project should be ACTIVE");
    }

    @Test(groups = {"api", "regression"},
            description = "The full project → suite → case graph can be built over the API")
    public void buildsProjectSuiteCaseGraph() {
        ProjectDto project = client.createProject(TestDataFactory.projectName(), "via api");
        SuiteDto suite = client.createSuite(project.id, TestDataFactory.suiteName(), "via api");
        Assert.assertEquals(suite.projectId, project.id, "Suite should belong to the project");

        TestCaseDto tc = client.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.HIGH);
        Assert.assertNotNull(tc.id, "Test-case id expected");
        Assert.assertEquals(tc.priority, "HIGH", "Priority should round-trip");
    }

    @Test(groups = {"api", "regression"},
            description = "A project can be deleted over the API")
    public void deleteProjectSucceeds() {
        ProjectDto project = client.createProject(TestDataFactory.projectName(), "to delete");
        client.deleteProject(project.id); // throws on non-2xx
    }
}
