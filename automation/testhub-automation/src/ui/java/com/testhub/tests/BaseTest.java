package com.testhub.tests;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.driver.DriverFactory;
import com.testhub.driver.DriverManager;
import com.testhub.enums.Priority;
import com.testhub.listeners.TestListener;
import com.testhub.pages.DashboardPage;
import com.testhub.pages.LoginPage;
import com.testhub.pages.ProjectDetailPage;
import com.testhub.pages.ProjectsPage;
import com.testhub.pages.RegisterPage;
import com.testhub.reports.ExtentManager;
import com.testhub.utils.ScreenshotUtils;
import com.testhub.utils.TestDataFactory;
import io.qameta.allure.Allure;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.ITestResult;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.Listeners;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.Base64;

/**
 * Shared lifecycle for every <b>UI</b> test.
 *
 * <p>UI tests authenticate <b>only through the browser</b> — the real sign-up
 * and login forms — never via the API. (Pure-API coverage lives under
 * {@code src/api}; the single API-assisted UI test lives under {@code src/hybrid}.)
 *
 * <p>The first time any test reaches the login/register screen we wake the
 * free-tier backend once via the on-page "Wake services" control, so a cold
 * start doesn't fail the first sign-in.
 */
@Listeners(TestListener.class)
public abstract class BaseTest {

    protected final Logger log = LogManager.getLogger(getClass());

    /** Guards the one-time, suite-wide service wake-up (parallel-safe). */
    private static volatile boolean servicesWoken = false;

    @BeforeSuite(alwaysRun = true)
    public void prepareSuite() {
        for (String dir : new String[]{FrameworkConstants.OUTPUT_DIR, FrameworkConstants.SCREENSHOT_DIR,
                FrameworkConstants.REPORT_DIR, FrameworkConstants.DOWNLOAD_DIR}) {
            new File(dir).mkdirs();
        }
    }

    @BeforeMethod(alwaysRun = true)
    public void setUp() {
        DriverFactory.createDriver();
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown(ITestResult result) {
        // Capture the screenshot BEFORE quitting — TestNG fires listeners after
        // @AfterMethod, by which point the driver would already be gone.
        if (!result.isSuccess() || ConfigManager.screenshotOnSuccess()) {
            ScreenshotUtils.captureAndStore();
        } else {
            // Nothing to report for this test; make sure a stale screenshot from a
            // previous test on this thread can't leak into the report.
            ScreenshotUtils.clearStored();
        }
        attachScreenshotToAllure(result);
        DriverManager.quitDriver();
    }

    /**
     * Attaches the end-of-test screenshot to the Allure result. Must happen here
     * (not in a listener) because the Allure test case is still open during
     * @AfterMethod, and the driver is still alive.
     */
    private void attachScreenshotToAllure(ITestResult result) {
        if (!ConfigManager.allureEnabled()) {
            return;
        }
        boolean wantShot = !result.isSuccess() || ConfigManager.screenshotOnSuccess();
        String base64 = ScreenshotUtils.getStored();
        if (wantShot && base64 != null) {
            Allure.addAttachment("Screenshot at test end", "image/png",
                    new ByteArrayInputStream(Base64.getDecoder().decode(base64)), "png");
        }
    }

    // --- UI navigation / auth helpers (browser only — no API) ----------------

    /** Opens the login screen, waking cold-start services once per suite. */
    protected LoginPage openLoginPage() {
        LoginPage login = new LoginPage().open();
        wakeServicesOnce(login);
        return login;
    }

    /** Opens the registration screen, waking cold-start services once per suite. */
    protected RegisterPage openRegisterPage() {
        RegisterPage register = new RegisterPage().open();
        wakeServicesOnce(register);
        return register;
    }

    /** Registers a brand-new TESTER through the UI form and lands on the dashboard. */
    protected DashboardPage signUpFreshUser() {
        String email = TestDataFactory.uniqueEmail();
        ExtentManager.setRunUser(email);
        return openRegisterPage()
                .registerAndLogin(TestDataFactory.fullName(), email, TestDataFactory.password());
    }

    /** Signs in through the real login form. */
    protected DashboardPage loginViaUi(String email, String password) {
        ExtentManager.setRunUser(email);
        return openLoginPage().loginAs(email, password);
    }

    /**
     * The default sign-in for UI tests. With {@code reuse.user=true} (default)
     * it logs in as the standing tester account through the login form — no
     * registration, so it never hits the live register throttle. With
     * {@code reuse.user=false} it signs up a fresh throwaway account instead.
     */
    protected DashboardPage signInTester() {
        if (ConfigManager.reuseUser()) {
            return loginViaUi(ConfigManager.testerEmail(), ConfigManager.testerPassword());
        }
        return signUpFreshUser();
    }

    /** Signs in as the configured ADMIN through the login form. */
    protected DashboardPage loginAsAdmin() {
        return loginViaUi(ConfigManager.adminEmail(), ConfigManager.adminPassword());
    }

    /**
     * Builds a project → suite → test-case graph entirely through the UI
     * (assumes already signed in), so focused tests for the deeper screens
     * (Suites, Runs, Run detail, Library) don't each re-implement the setup.
     *
     * @return the created project's id (for opening its runs view)
     */
    protected String seedProjectSuiteCase(String projectName, String suiteName, String caseTitle) {
        ProjectsPage projects = new ProjectsPage().open().createProject(projectName, "seeded via UI");
        ProjectDetailPage detail = projects.openProject(projectName);
        String projectId = detail.getProjectId();
        detail.createSuite(suiteName, "seeded via UI");
        detail.openSuite(suiteName).createTestCase(caseTitle, "seeded via UI",
                TestDataFactory.steps(), TestDataFactory.expected(), Priority.HIGH);
        return projectId;
    }

    private void wakeServicesOnce(com.testhub.pages.AuthPage authPage) {
        if (servicesWoken) {
            return;
        }
        synchronized (BaseTest.class) {
            if (servicesWoken) {
                return;
            }
            authPage.wakeServicesAndWait(); // returns immediately if services are already up
            servicesWoken = true;
        }
    }
}
