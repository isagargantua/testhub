package com.testhub.tests.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** One row of negative-login test data (from invalid-logins.json). */
@JsonIgnoreProperties(ignoreUnknown = true)
public class LoginData {
    public String scenario;
    public String email;
    public String password;
    public String expectedError;

    @Override
    public String toString() {
        return scenario;
    }
}
