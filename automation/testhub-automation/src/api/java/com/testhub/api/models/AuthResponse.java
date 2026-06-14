package com.testhub.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Response body of POST /api/auth/login and /api/auth/register. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AuthResponse {
    public UserDto user;
    public String accessToken;
    public String refreshToken;
}
