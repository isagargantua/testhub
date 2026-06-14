package com.testhub.tests.data;

import com.testhub.enums.Priority;
import com.testhub.utils.ExcelDataReader;
import com.testhub.utils.JsonDataReader;
import org.testng.annotations.DataProvider;

import java.util.List;
import java.util.Map;

/**
 * Central home for TestNG {@code @DataProvider}s. Sourcing data from JSON, CSV
 * and Excel is what makes the framework "data-driven" — the same test body runs
 * once per external data row.
 */
public class DataProviders {

    @DataProvider(name = "invalidLogins")
    public static Object[][] invalidLogins() {
        List<LoginData> rows = JsonDataReader.readList("invalid-logins.json", LoginData.class);
        return JsonDataReader.toDataProvider(rows);
    }

    @DataProvider(name = "testCases")
    public static Object[][] testCases() {
        List<TestCaseData> rows = JsonDataReader.readList("testcases.json", TestCaseData.class);
        return JsonDataReader.toDataProvider(rows);
    }

    @DataProvider(name = "priorities")
    public static Object[][] priorities() {
        return new Object[][]{
                {Priority.LOW}, {Priority.MEDIUM}, {Priority.HIGH}, {Priority.CRITICAL}
        };
    }

    /** Excel-driven example — reads the same data from an .xlsx sheet if present. */
    @DataProvider(name = "casesFromExcel")
    public static Object[][] casesFromExcel() {
        List<Map<String, String>> rows = ExcelDataReader.read("testcases.xlsx", "cases");
        return ExcelDataReader.toDataProvider(rows);
    }
}
