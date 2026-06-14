package com.testhub.tests.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.testhub.enums.Priority;

/** One row of test-case creation data (from testcases.json). */
@JsonIgnoreProperties(ignoreUnknown = true)
public class TestCaseData {
    public String title;
    public String description;
    public String steps;
    public String expected;
    public String priority;

    public Priority priorityEnum() {
        return Priority.valueOf(priority);
    }

    @Override
    public String toString() {
        return title + " [" + priority + "]";
    }
}
