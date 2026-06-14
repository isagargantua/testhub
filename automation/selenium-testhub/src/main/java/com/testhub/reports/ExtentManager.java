package com.testhub.reports;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;
import com.aventstack.extentreports.reporter.configuration.Theme;
import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Owns the single {@link ExtentReports} instance and a per-thread
 * {@link ExtentTest}, so parallel tests log into their own report node without
 * interleaving.
 */
public final class ExtentManager {

    private static ExtentReports extent;
    private static final ThreadLocal<ExtentTest> CURRENT = new ThreadLocal<>();

    // Paths resolved at init; final named report is written on flush once user is known
    private static String tempReportPath;       // working file written during the run
    private static String runTimestamp;         // e.g. 2026-06-06_16-27-58
    private static String runUserLocal = "unknown"; // local part of the logged-in email
    private static String finalReportName;      // cached on first flush so it never changes

    private ExtentManager() {
    }

    public static synchronized ExtentReports getInstance() {
        if (extent == null) {
            File latestDir  = new File(FrameworkConstants.REPORT_DIR, "Latest");
            File archiveDir = new File(FrameworkConstants.REPORT_DIR, "archive");
            File workDir    = new File(FrameworkConstants.REPORT_DIR, ".work");
            latestDir.mkdirs();
            archiveDir.mkdirs();
            workDir.mkdirs();

            // --- Archive the PREVIOUS run NOW, at the start of this one. ---
            // Anything sitting in Latest/ belongs to a prior run, so move it to archive/.
            // (Doing this here — not in flush — means the current run's report is never
            //  archived during its own multiple flush() calls.)
            File[] previous = latestDir.listFiles(f -> f.getName().toLowerCase().endsWith(".html"));
            if (previous != null) {
                for (File old : previous) {
                    try {
                        File dest = new File(archiveDir, old.getName());
                        if (dest.exists()) dest.delete();      // avoid move-conflict on duplicate names
                        FileUtils.moveFile(old, dest);
                    } catch (IOException ignored) {}
                }
            }

            // Capture run timestamp once — used for both the report title and final filename
            runTimestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());

            // Spark writes to a tucked-away working file; flush() copies it into Latest/.
            tempReportPath = Paths.get(workDir.getPath(), "running.html").toString();
            new File(tempReportPath).deleteOnExit();

            ExtentSparkReporter spark = new ExtentSparkReporter(tempReportPath);
            spark.config().setTheme(Theme.DARK);
            spark.config().setDocumentTitle("testHub — Automation Results");
            spark.config().setReportName("testHub Selenium Hybrid Framework");
            spark.config().setTimeStampFormat("dd MMM yyyy  HH:mm:ss");
            spark.config().setEncoding("UTF-8");
            spark.config().setCss(reportCss());
            spark.config().setJs(reportJs());

            extent = new ExtentReports();
            extent.attachReporter(spark);

            String runTime = new SimpleDateFormat("dd MMM yyyy  HH:mm:ss").format(new Date());

            // --- Environment panel ---
            extent.setSystemInfo("📅 Run date/time", runTime);
            extent.setSystemInfo("👤 Logged-in user", "pending first login…");
            extent.setSystemInfo("🌐 App URL",        ConfigManager.baseUrl());
            extent.setSystemInfo("🔌 API Gateway",    ConfigManager.apiBaseUrl());
            extent.setSystemInfo("🖥 Browser",         ConfigManager.browser().toUpperCase()
                                                       + (ConfigManager.headless() ? "  (headless)" : ""));
            extent.setSystemInfo("⏱ Explicit wait",   ConfigManager.explicitTimeout().toSeconds() + " s");
            extent.setSystemInfo("🔁 Retry count",    String.valueOf(ConfigManager.retryCount()));
            extent.setSystemInfo("💻 OS",              System.getProperty("os.name") + "  "
                                                       + System.getProperty("os.version"));
            extent.setSystemInfo("☕ Java",            System.getProperty("java.version"));
        }
        return extent;
    }

    /**
     * Called once the logged-in user is known. Updates the system info panel and
     * stores the local part of the email for use in the final report filename.
     */
    public static synchronized void setRunUser(String email) {
        if (email == null || email.isBlank()) return;
        extent.setSystemInfo("👤 Logged-in user", email);
        // local part = everything before '@', e.g. "testuser1" from "testuser1@gmail.com"
        int at = email.indexOf('@');
        runUserLocal = (at > 0) ? email.substring(0, at) : email;
    }

    private static String reportCss() {
        return
            // Dashboard cards
            ".dashboard-view .card { border-radius: 10px; }" +
            // Pass / fail / skip badge colours
            ".badge-success, .label-success { background:#1aad72!important; }" +
            ".badge-danger,  .label-danger  { background:#e53935!important; }" +
            ".badge-warning, .label-warning { background:#fb8c00!important; }" +
            // Log entry colours
            ".test-content .pass-bg { background:#0d3326; border-left:3px solid #1aad72; }" +
            ".test-content .fail-bg { background:#3b0f0f; border-left:3px solid #e53935; }" +
            // Screenshot thumbnails — show a bit larger
            ".screenshot-container img { max-width:640px; border-radius:6px; margin-top:6px; }" +
            // Monospace for stack traces
            "pre.stack-trace { font-size:11px; background:#1a1a2e; padding:10px;" +
            "  border-radius:4px; overflow-x:auto; white-space:pre-wrap; }" +
            // Category chips
            ".category-item { border-radius:4px; font-size:11px; }" +
            // Header banner
            "#report-header { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%); }";
    }

    private static String reportJs() {
        // Auto-expand FAILED tests on page load for quick triage.
        return
            "document.addEventListener('DOMContentLoaded', function() {" +
            "  document.querySelectorAll('.test-item.fail').forEach(function(el) {" +
            "    el.classList.add('open');" +
            "  });" +
            "});";
    }

    public static void setTest(ExtentTest test) {
        CURRENT.set(test);
    }

    public static ExtentTest getTest() {
        return CURRENT.get();
    }

    public static void unload() {
        CURRENT.remove();
    }

    public static synchronized void flush() {
        if (extent == null) return;
        extent.flush();   // (re)writes the working file

        // Compute the final name ONCE and reuse it for every flush in this run,
        // so repeated flush() calls always overwrite the SAME single Latest file.
        if (finalReportName == null) {
            finalReportName = "Report-" + runTimestamp + "_" + runUserLocal + ".html";
        }

        File latestDir = new File(FrameworkConstants.REPORT_DIR, "Latest");
        latestDir.mkdirs();
        try {
            // Overwrite (not append) — exactly one file lives in Latest/ for the current run.
            FileUtils.copyFile(new File(tempReportPath), new File(latestDir, finalReportName));
        } catch (IOException ignored) {}
    }
}
