package com.testhub.enums;

import com.testhub.exceptions.FrameworkException;

import java.util.Arrays;

/** Supported browsers. Mapped from the {@code browser} config key. */
public enum BrowserType {
    CHROME, FIREFOX, EDGE;

    public static BrowserType from(String value) {
        return Arrays.stream(values())
                .filter(b -> b.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new FrameworkException(
                        "Unsupported browser '" + value + "'. Supported: " + Arrays.toString(values())));
    }
}
