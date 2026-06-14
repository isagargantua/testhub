package com.testhub.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RunDto {
    public String id;
    public String name;
    public String description;
    public String status;
    public String projectId;
    public List<String> selectedCaseIds;
}
