package com.testhub.config;

import com.testhub.exceptions.FrameworkException;

import java.io.InputStream;
import java.time.Duration;
import java.util.Properties;

/**
 * Single source of truth for configuration.
 *
 * <p>Resolution order for any key (highest priority first):
 * <ol>
 *     <li>JVM system property  ({@code -Dbrowser=firefox})</li>
 *     <li>OS environment variable (UPPER_SNAKE_CASE of the key, e.g. {@code BASE_URL})</li>
 *     <li>{@code config/config.properties} on the classpath</li>
 * </ol>
 *
 * <p>This lets the exact same build run locally, on the live deployment, and in
 * CI just by flipping {@code -D} flags or env vars — no code or file edits.
 */
public final class ConfigManager {

    private static final Properties PROPERTIES = new Properties();

    static {
        try (InputStream in = ConfigManager.class.getClassLoader()
                .getResourceAsStream("config/config.properties")) {
            if (in == null) {
                throw new FrameworkException("config/config.properties not found on the classpath");
            }
            PROPERTIES.load(in);
        } catch (Exception e) {
            throw new FrameworkException("Failed to load config.properties", e);
        }
    }

    private ConfigManager() {
    }

    /** Raw lookup with system-property and environment-variable override. */
    public static String get(String key) {
        String sys = System.getProperty(key);
        if (sys != null && !sys.isBlank()) {
            return sys.trim();
        }
        String env = System.getenv(key.toUpperCase().replace('.', '_'));
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        String value = PROPERTIES.getProperty(key);
        if (value == null) {
            throw new FrameworkException("Missing configuration key: " + key);
        }
        return value.trim();
    }

    public static String get(String key, String defaultValue) {
        try {
            String value = get(key);
            return value.isBlank() ? defaultValue : value;
        } catch (FrameworkException e) {
            return defaultValue;
        }
    }

    public static int getInt(String key) {
        return Integer.parseInt(get(key));
    }

    public static boolean getBoolean(String key) {
        return Boolean.parseBoolean(get(key));
    }

    // --- Typed convenience accessors -----------------------------------------

    public static String baseUrl() {
        return stripTrailingSlash(get("base.url"));
    }

    public static String apiBaseUrl() {
        return stripTrailingSlash(get("api.base.url"));
    }

    public static String browser() {
        return get("browser", "chrome").toLowerCase();
    }

    public static boolean headless() {
        return Boolean.parseBoolean(get("headless", "false"));
    }

    public static Duration explicitTimeout() {
        return Duration.ofSeconds(getInt("timeout.explicit"));
    }

    public static Duration pageLoadTimeout() {
        return Duration.ofSeconds(getInt("timeout.pageload"));
    }

    public static Duration pollingInterval() {
        return Duration.ofMillis(Long.parseLong(get("timeout.polling.millis", "300")));
    }

    public static int retryCount() {
        return Integer.parseInt(get("retry.count", "1"));
    }

    public static boolean screenshotOnFailure() {
        return Boolean.parseBoolean(get("screenshot.on.failure", "true"));
    }

    public static boolean screenshotOnSuccess() {
        return Boolean.parseBoolean(get("screenshot.on.success", "false"));
    }

    public static boolean warmupEnabled() {
        return Boolean.parseBoolean(get("warmup.enabled", "true"));
    }

    /** Which report(s) to produce: {@code extent}, {@code allure}, or {@code both}. */
    public static String reportType() {
        return get("report.type", "both").toLowerCase();
    }

    public static boolean extentEnabled() {
        String type = reportType();
        return type.equals("extent") || type.equals("both");
    }

    public static boolean allureEnabled() {
        String type = reportType();
        return type.equals("allure") || type.equals("both");
    }

    public static String adminEmail() {
        return get("admin.email");
    }

    public static String adminPassword() {
        return get("admin.password");
    }

    public static String testerEmail() {
        return get("tester.email");
    }

    public static String testerPassword() {
        return get("tester.password");
    }

    public static boolean reuseUser() {
        return Boolean.parseBoolean(get("reuse.user", "false"));
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
