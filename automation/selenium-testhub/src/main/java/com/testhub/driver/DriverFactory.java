package com.testhub.driver;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.enums.BrowserType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.firefox.FirefoxDriver;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * Creates and configures a {@link WebDriver} per the active configuration and
 * registers it with {@link DriverManager}.
 *
 * <p>No driver binaries are managed here on purpose: Selenium 4 ships
 * <b>Selenium Manager</b>, which downloads and caches the correct driver for
 * the installed browser automatically.
 */
public final class DriverFactory {

    private static final Logger log = LogManager.getLogger(DriverFactory.class);

    private DriverFactory() {
    }

    public static WebDriver createDriver() {
        BrowserType browser = BrowserType.from(ConfigManager.browser());
        boolean headless = ConfigManager.headless();
        log.info("Launching {} (headless={})", browser, headless);

        WebDriver driver = switch (browser) {
            case CHROME -> new ChromeDriver(chromeOptions(headless));
            case EDGE -> new EdgeDriver(edgeOptions(headless));
            case FIREFOX -> new FirefoxDriver(firefoxOptions(headless));
        };

        configureTimeoutsAndWindow(driver);
        DriverManager.setDriver(driver);
        return driver;
    }

    private static ChromeOptions chromeOptions(boolean headless) {
        ChromeOptions options = new ChromeOptions();
        if (headless) {
            options.addArguments("--headless=new");
            // Headless 'maximize' is unreliable and often lands below testHub's
            // lg breakpoint (1024px), which hides the desktop sidebar. Force a
            // desktop-width viewport so responsive layouts match a real screen.
            options.addArguments("--window-size=1920,1080");
        }
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--disable-notifications");
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        applyExtraArguments(options::addArguments);

        // Force downloads to our managed folder so file-export tests are deterministic.
        Map<String, Object> prefs = new HashMap<>();
        new File(FrameworkConstants.DOWNLOAD_DIR).mkdirs();
        prefs.put("download.default_directory", FrameworkConstants.DOWNLOAD_DIR);
        prefs.put("download.prompt_for_download", false);
        prefs.put("profile.default_content_settings.popups", 0);
        options.setExperimentalOption("prefs", prefs);
        return options;
    }

    private static EdgeOptions edgeOptions(boolean headless) {
        EdgeOptions options = new EdgeOptions();
        if (headless) {
            options.addArguments("--headless=new");
            options.addArguments("--window-size=1920,1080");
        }
        options.addArguments("--remote-allow-origins=*");
        applyExtraArguments(options::addArguments);
        Map<String, Object> prefs = new HashMap<>();
        new File(FrameworkConstants.DOWNLOAD_DIR).mkdirs();
        prefs.put("download.default_directory", FrameworkConstants.DOWNLOAD_DIR);
        prefs.put("download.prompt_for_download", false);
        options.setExperimentalOption("prefs", prefs);
        return options;
    }

    private static FirefoxOptions firefoxOptions(boolean headless) {
        FirefoxOptions options = new FirefoxOptions();
        if (headless) {
            options.addArguments("-headless");
            options.addArguments("--width=1920", "--height=1080");
        }
        new File(FrameworkConstants.DOWNLOAD_DIR).mkdirs();
        options.addPreference("browser.download.folderList", 2);
        options.addPreference("browser.download.dir", FrameworkConstants.DOWNLOAD_DIR);
        options.addPreference("browser.helperApps.neverAsk.saveToDisk",
                "text/csv,application/json,application/octet-stream");
        applyExtraArguments(options::addArguments);
        return options;
    }

    private static void applyExtraArguments(java.util.function.Consumer<String> adder) {
        String extra = ConfigManager.get("browser.arguments", "");
        if (!extra.isBlank()) {
            for (String arg : extra.split(",")) {
                if (!arg.isBlank()) {
                    adder.accept(arg.trim());
                }
            }
        }
    }

    private static void configureTimeoutsAndWindow(WebDriver driver) {
        driver.manage().timeouts().pageLoadTimeout(ConfigManager.pageLoadTimeout());

        String windowSize = ConfigManager.get("window.size", "maximize");
        if (windowSize.matches("\\d+x\\d+")) {
            String[] wh = windowSize.toLowerCase().split("x");
            driver.manage().window().setSize(
                    new Dimension(Integer.parseInt(wh[0].trim()), Integer.parseInt(wh[1].trim())));
        } else if ("maximize".equalsIgnoreCase(windowSize) && !ConfigManager.headless()) {
            // In headless, maximize() collapses to a tiny virtual viewport and
            // would override the --window-size launch arg, hiding the desktop
            // sidebar. The launch arg already set a 1920x1080 viewport there.
            driver.manage().window().maximize();
        }
    }
}
