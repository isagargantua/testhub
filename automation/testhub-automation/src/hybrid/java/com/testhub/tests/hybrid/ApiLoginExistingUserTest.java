package com.testhub.tests.hybrid;

import com.testhub.api.ApiClient;
import com.testhub.api.models.AuthResponse;
import com.testhub.api.models.ProjectDto;
import com.testhub.config.ConfigManager;
import com.testhub.pages.ProjectsPage;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * <b>HYBRID</b> test #2 — uses the <b>existing</b> standing tester account
 * ({@code tester.email} / {@code tester.password} from config) instead of
 * registering anyone, so it never touches the throttled register endpoint.
 *
 * <p>Flow: log in over the <b>API</b> as the existing user, seed a project over
 * the API, bridge the session into the browser, then verify through the real
 * <b>UI</b> that the project is visible. Cleans up after itself via the API.
 */
public class ApiLoginExistingUserTest extends HybridBaseTest {

    @Test(groups = {"hybrid", "smoke"},
            description = "API login as the existing tester; an API-seeded project is visible in the UI")
    public void existingUserApiLoginSeesSeededProjectInUi() {
        // 1. Log in over the API as the standing tester (no registration involved).
        ApiClient api = new ApiClient();
        AuthResponse auth = api.login(ConfigManager.testerEmail(), ConfigManager.testerPassword());

        // 2. Seed a uniquely-named project over the API.
        String projectName = TestDataFactory.projectName();
        ProjectDto project = api.createProject(projectName, "seeded via API (existing user)");

        try {
            // 3. Bridge the API session into the browser and verify through the UI.
            injectApiSession(auth);
            ProjectsPage projects = new ProjectsPage().open();
            Assert.assertTrue(projects.isProjectVisible(projectName),
                    "The API-seeded project should be visible in the Projects UI");
            Assert.assertEquals(projects.navbar().getRole(), "TESTER",
                    "The standing account should be signed in as TESTER");
        } finally {
            // 4. Self-clean: the standing account keeps no leftovers from this test.
            api.deleteProject(project.id);
        }
    }
}
