package com.testhub.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class SuiteDto {
    public String id;
    public String name;
    public String description;
    public String projectId;
}
