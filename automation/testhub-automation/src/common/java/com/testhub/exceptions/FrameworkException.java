package com.testhub.exceptions;

/**
 * Unchecked exception used across the framework to fail fast with a clear,
 * framework-level message (config missing, driver init failed, data file
 * unreadable, etc.). Wrapping low-level checked exceptions in this keeps test
 * code and page objects free of boilerplate try/catch.
 */
public class FrameworkException extends RuntimeException {

    public FrameworkException(String message) {
        super(message);
    }

    public FrameworkException(String message, Throwable cause) {
        super(message, cause);
    }
}
