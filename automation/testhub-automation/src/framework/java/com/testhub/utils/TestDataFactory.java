package com.testhub.utils;

import net.datafaker.Faker;

/**
 * Generates unique, realistic test data. Uniqueness (timestamp + random) keeps
 * parallel runs from colliding on names/emails — essential when tests create
 * real records against a shared backend.
 */
public final class TestDataFactory {

    private static final Faker FAKER = new Faker();

    private TestDataFactory() {
    }

    private static String unique() {
        return System.currentTimeMillis() + "" + FAKER.number().numberBetween(100, 999);
    }

    public static String uniqueEmail() {
        return "qa_" + unique() + "@testhub.io";
    }

    public static String fullName() {
        return FAKER.name().fullName();
    }

    public static String password() {
        // Always satisfies the API's min-length-6 rule.
        return "Pass@" + FAKER.number().numberBetween(10000, 99999);
    }

    public static String projectName() {
        return "Proj " + FAKER.app().name() + " " + unique();
    }

    public static String suiteName() {
        return "Suite " + FAKER.lorem().word() + " " + unique();
    }

    public static String testCaseTitle() {
        return "TC: " + capitalize(FAKER.lorem().sentence(4)).replace(".", "") + " " + unique();
    }

    public static String runName() {
        return "Run " + FAKER.lorem().word() + " " + unique();
    }

    public static String sentence() {
        return FAKER.lorem().sentence();
    }

    public static String steps() {
        return "1. " + FAKER.lorem().sentence()
                + System.lineSeparator() + "2. " + FAKER.lorem().sentence()
                + System.lineSeparator() + "3. " + FAKER.lorem().sentence();
    }

    public static String expected() {
        return FAKER.lorem().sentence();
    }

    private static String capitalize(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
