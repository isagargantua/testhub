package com.testhub.listeners;

import com.testhub.config.ConfigManager;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.testng.IRetryAnalyzer;
import org.testng.ITestResult;

/**
 * Retries a failed test up to {@code retry.count} times. The free-tier backend
 * can throw a transient cold-start failure on the very first hit; one retry
 * turns that into a pass instead of a flaky red. Set {@code retry.count=0} to
 * disable.
 */
public class RetryAnalyzer implements IRetryAnalyzer {

    private static final Logger log = LogManager.getLogger(RetryAnalyzer.class);
    private final int maxRetry = ConfigManager.retryCount();
    private int attempts = 0;

    @Override
    public boolean retry(ITestResult result) {
        if (attempts < maxRetry) {
            attempts++;
            log.warn("Retrying '{}' (attempt {}/{}) after failure",
                    result.getName(), attempts, maxRetry);
            return true;
        }
        return false;
    }
}
