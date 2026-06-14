package com.testhub.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TestCaseDto {
    public String id;
    public String title;
    public String description;
    public String steps;
    public String expected;
    public String priority;
    public String suiteId;
}
