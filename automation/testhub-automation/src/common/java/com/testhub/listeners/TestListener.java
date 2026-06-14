package com.testhub.listeners;

import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.MediaEntityBuilder;
import com.aventstack.extentreports.Status;
import com.testhub.config.ConfigManager;
import com.testhub.reports.ExtentManager;
import com.testhub.utils.ScreenshotUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.ISuite;
import org.testng.ISuiteListener;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Bridges TestNG lifecycle events into ExtentReports and screenshot capture.
 * One instance handles report init/flush (suite level) and per-test logging,
 * including an embedded screenshot on failure.
 */
public class TestListener implements ITestListener, ISuiteListener {

    private static final Logger log = LogManager.getLogger(TestListener.class);

    @Override
    public void onStart(ISuite suite) {
        log.info("===== Suite started: {} (report.type={}) =====",
                suite.getName(), ConfigManager.reportType());
        if (ConfigManager.extentEnabled()) {
            ExtentManager.getInstance();
        }
    }

    @Override
    public void onFinish(ISuite suite) {
        ExtentManager.flush();
        log.info("===== Suite finished: {} — report at {} =====",
                suite.getName(), "test-output/reports/" + com.testhub.constants.FrameworkConstants.REPORT_NAME);
    }

    @Override
    public void onTestStart(ITestResult result) {
        log.info(">>> START: {}", testTitle(result));
        if (!ConfigManager.extentEnabled()) {
            return; // Allure records via its own auto-registered TestNG listener
        }
        String title       = testTitle(result);
        String description = result.getMethod().getDescription();
        String className   = result.getTestClass().getName();

        ExtentTest test = ExtentManager.getInstance()
                .createTest("<b>" + title + "</b>",
                        description == null || description.isBlank() ? "&nbsp;" : description);

        // Class label as author so it shows in the sidebar filter
        test.assignAuthor(simpleClassName(className));

        for (String group : result.getMethod().getGroups()) {
            test.assignCategory(group);
        }

        test.info("<b>Class:</b> " + className);
        if (result.getParameters().length > 0) {
            test.info("<b>Parameters:</b> " + Arrays.stream(result.getParameters())
                    .map(Object::toString).collect(Collectors.joining(", ")));
        }

        ExtentManager.setTest(test);
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        log.info("<<< PASS : {}", testTitle(result));
        ExtentTest test = ExtentManager.getTest();
        if (test != null) {
            test.log(Status.PASS,
                    "✅ <b>PASSED</b> &nbsp;|&nbsp; Duration: <b>" + durationMs(result) + " ms</b>");
            if (ConfigManager.screenshotOnSuccess()) {
                attachScreenshot(test, Status.PASS);
            }
        }
        ExtentManager.unload();
    }

    @Override
    public void onTestFailure(ITestResult result) {
        Throwable error = result.getThrowable();
        log.error("<<< FAIL : {} — {}", testTitle(result), error == null ? "" : error.getMessage());
        ExtentTest test = ExtentManager.getTest();
        if (test != null) {
            test.log(Status.FAIL,
                    "❌ <b>FAILED</b> &nbsp;|&nbsp; Duration: <b>" + durationMs(result) + " ms</b>");

            if (error != null) {
                // Short reason — the assertion message or exception message
                test.log(Status.FAIL,
                        "<b>Reason:</b> " + error.getClass().getSimpleName()
                        + " — " + error.getMessage());

                // Full stack trace in a readable mono block
                test.log(Status.FAIL,
                        "<b>Stack Trace:</b><br><pre class='stack-trace'>"
                        + escapeHtml(stackTrace(error)) + "</pre>");
            }

            // Screenshot always on failure
            attachScreenshot(test, Status.FAIL);
        }
        ExtentManager.unload();
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        log.warn("<<< SKIP : {}", testTitle(result));
        ExtentTest test = ExtentManager.getTest();
        if (test != null) {
            Throwable cause = result.getThrowable();
            String reason = cause != null ? cause.getMessage() : "Dependency or configuration skip";
            test.log(Status.SKIP, "⚠️ <b>SKIPPED</b> — " + reason);
            if (cause != null) {
                test.log(Status.SKIP,
                        "<b>Cause:</b><br><pre class='stack-trace'>"
                        + escapeHtml(stackTrace(cause)) + "</pre>");
            }
            // Capture current browser state even on skip (e.g. @BeforeMethod failure)
            attachScreenshot(test, Status.SKIP);
        }
        ExtentManager.unload();
    }

    @Override
    public void onFinish(ITestContext context) {
        ExtentManager.flush();
    }

    // --- helpers ------------------------------------------------------------

    private void attachScreenshot(ExtentTest test, Status status) {
        // Use the screenshot captured in @AfterMethod (before driver quit).
        // captureBase64() would return null here because the driver is already closed.
        String base64 = ScreenshotUtils.getStored();
        if (base64 != null) {
            test.log(status, "📸 <b>Screenshot at test end</b>");
            test.log(status, MediaEntityBuilder.createScreenCaptureFromBase64String(base64).build());
            ScreenshotUtils.clearStored();
        }
    }

    private String testTitle(ITestResult result) {
        Object[] args = result.getParameters();
        String params = (args != null && args.length > 0)
                ? " [" + Arrays.stream(args).map(Object::toString).collect(Collectors.joining(", ")) + "]"
                : "";
        return result.getMethod().getMethodName() + params;
    }

    private static String simpleClassName(String fqcn) {
        int dot = fqcn.lastIndexOf('.');
        return dot >= 0 ? fqcn.substring(dot + 1) : fqcn;
    }

    private static long durationMs(ITestResult result) {
        return result.getEndMillis() - result.getStartMillis();
    }

    private static String stackTrace(Throwable t) {
        StringWriter sw = new StringWriter();
        t.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
