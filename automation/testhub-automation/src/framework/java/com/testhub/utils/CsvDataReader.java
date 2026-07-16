package com.testhub.utils;

import com.testhub.constants.FrameworkConstants;
import com.testhub.exceptions.FrameworkException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads {@code .csv} files from the test-data folder into a list of row maps
 * (header → value), completing the JSON / CSV / Excel data-source trio. The
 * first line is treated as the header. Handles RFC-4180 quoting: quoted
 * fields, embedded commas, and doubled quotes.
 */
public final class CsvDataReader {

    private CsvDataReader() {
    }

    public static List<Map<String, String>> read(String fileName) {
        Path path = Paths.get(FrameworkConstants.TEST_DATA_DIR, fileName);
        List<Map<String, String>> rows = new ArrayList<>();

        List<String> lines;
        try {
            lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new FrameworkException("Failed to read CSV file: " + path, e);
        }
        if (lines.isEmpty()) {
            return rows;
        }

        List<String> headers = parseLine(lines.get(0));
        for (int i = 1; i < lines.size(); i++) {
            if (lines.get(i).isBlank()) {
                continue;
            }
            List<String> values = parseLine(lines.get(i));
            Map<String, String> row = new LinkedHashMap<>();
            for (int c = 0; c < headers.size(); c++) {
                row.put(headers.get(c).trim(), c < values.size() ? values.get(c).trim() : "");
            }
            rows.add(row);
        }
        return rows;
    }

    public static Object[][] toDataProvider(List<Map<String, String>> rows) {
        Object[][] data = new Object[rows.size()][1];
        for (int i = 0; i < rows.size(); i++) {
            data[i][0] = rows.get(i);
        }
        return data;
    }

    private static List<String> parseLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (inQuotes) {
                if (ch == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');   // escaped quote
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(ch);
                }
            } else if (ch == '"') {
                inQuotes = true;
            } else if (ch == ',') {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        fields.add(current.toString());
        return fields;
    }
}
