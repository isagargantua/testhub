package com.testhub.utils;

import com.testhub.constants.FrameworkConstants;
import com.testhub.driver.DriverManager;
import org.apache.commons.io.FileUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;

import java.io.File;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/** Capture screenshots to disk (for triage) and as Base64 (to embed in reports). */
public final class ScreenshotUtils {

    private static final Logger log = LogManager.getLogger(ScreenshotUtils.class);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss_SSS");

    // Stores the last screenshot per thread so the TestNG listener can retrieve it
    // after @AfterMethod has already quit the driver.
    private static final ThreadLocal<String> PENDING = new ThreadLocal<>();

    private ScreenshotUtils() {
    }

    /** @return absolute path of the saved PNG, or {@code null} if capture failed. */
    public static String capture(String testName) {
        if (!DriverManager.hasDriver()) {
            return null;
        }
        try {
            File src = ((TakesScreenshot) DriverManager.getDriver()).getScreenshotAs(OutputType.FILE);
            String fileName = sanitize(testName) + "_" + LocalDateTime.now().format(STAMP) + ".png";
            File dest = Paths.get(FrameworkConstants.SCREENSHOT_DIR, fileName).toFile();
            FileUtils.copyFile(src, dest);
            return dest.getAbsolutePath();
        } catch (Exception e) {
            log.warn("Screenshot capture failed: {}", e.getMessage());
            return null;
        }
    }

    /** Base64 PNG for inline embedding in the Extent report. */
    public static String captureBase64() {
        if (!DriverManager.hasDriver()) {
            return null;
        }
        try {
            return ((TakesScreenshot) DriverManager.getDriver()).getScreenshotAs(OutputType.BASE64);
        } catch (Exception e) {
            log.warn("Base64 screenshot capture failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Captures a Base64 screenshot NOW (while the driver is still alive) and stores
     * it in a per-thread slot so the TestNG listener can retrieve it after tearDown
     * has already quit the driver.  Call this at the END of @AfterMethod, before quit.
     */
    public static void captureAndStore() {
        String b64 = captureBase64();
        if (b64 != null) {
            PENDING.set(b64);
        } else {
            PENDING.remove();
        }
    }

    /** Returns the screenshot stored by {@link #captureAndStore()}, or {@code null}. */
    public static String getStored() {
        return PENDING.get();
    }

    /** Clears the stored screenshot (called after the listener has consumed it). */
    public static void clearStored() {
        PENDING.remove();
    }

    public static String toBase64(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static String sanitize(String name) {
        return name == null ? "screenshot" : name.replaceAll("[^a-zA-Z0-9-_]", "_");
    }
}
