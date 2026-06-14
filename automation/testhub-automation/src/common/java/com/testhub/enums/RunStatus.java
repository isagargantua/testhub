package com.testhub.enums;

/** Lifecycle status of a test run. */
public enum RunStatus {
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    ABORTED("Aborted");

    private final String label;

    RunStatus(String label) {
        this.label = label;
    }

    /** Human-readable label as shown in the run-status dropdowns. */
    public String label() {
        return label;
    }
}
