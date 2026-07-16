package com.testhub.tests.data;

import com.testhub.constants.FrameworkConstants;
import com.testhub.enums.Priority;
import com.testhub.utils.CsvDataReader;
import com.testhub.utils.ExcelDataReader;
import com.testhub.utils.JsonDataReader;
import org.testng.SkipException;
import org.testng.annotations.DataProvider;

import java.nio.file.Files;
import java.nio.file.Paths;
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

    /** CSV-driven — one row per line of testcases.csv (header → value maps). */
    @DataProvider(name = "casesFromCsv")
    public static Object[][] casesFromCsv() {
        List<Map<String, String>> rows = CsvDataReader.read("testcases.csv");
        return CsvDataReader.toDataProvider(rows);
    }

    /**
     * Excel-driven example. The workbook is optional (it isn't checked in), so
     * tests wired to this provider skip cleanly instead of erroring when the
     * file is absent.
     */
    @DataProvider(name = "casesFromExcel")
    public static Object[][] casesFromExcel() {
        if (!Files.exists(Paths.get(FrameworkConstants.TEST_DATA_DIR, "testcases.xlsx"))) {
            throw new SkipException("testcases.xlsx not present in testdata — skipping Excel-driven cases");
        }
        List<Map<String, String>> rows = ExcelDataReader.read("testcases.xlsx", "cases");
        return ExcelDataReader.toDataProvider(rows);
    }
}
