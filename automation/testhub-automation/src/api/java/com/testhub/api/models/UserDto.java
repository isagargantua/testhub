package com.testhub.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {
    public String id;
    public String name;
    public String email;
    public String role;
}
