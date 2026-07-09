package com.testhub.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;
import com.testhub.constants.FrameworkConstants;
import com.testhub.exceptions.FrameworkException;

import java.io.File;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/**
 * Reads JSON test-data files from {@code src/resources/testdata}. Powers
 * the data-driven half of the framework: a TestNG {@code @DataProvider} can
 * hand each row of a JSON array to a test method.
 */
public final class JsonDataReader {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonDataReader() {
    }

    private static File resolve(String fileName) {
        File file = Paths.get(FrameworkConstants.TEST_DATA_DIR, fileName).toFile();
        if (!file.exists()) {
            throw new FrameworkException("Test-data file not found: " + file.getAbsolutePath());
        }
        return file;
    }

    /** Deserialize the whole file into a single POJO of type {@code type}. */
    public static <T> T read(String fileName, Class<T> type) {
        try {
            return MAPPER.readValue(resolve(fileName), type);
        } catch (Exception e) {
            throw new FrameworkException("Failed to parse JSON: " + fileName, e);
        }
    }

    /** Deserialize a top-level JSON array into a typed list. */
    public static <T> List<T> readList(String fileName, Class<T> elementType) {
        try {
            CollectionType listType = MAPPER.getTypeFactory()
                    .constructCollectionType(List.class, elementType);
            return MAPPER.readValue(resolve(fileName), listType);
        } catch (Exception e) {
            throw new FrameworkException("Failed to parse JSON array: " + fileName, e);
        }
    }

    /** Generic untyped read — a list of String→Object maps, one per array entry. */
    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> readMaps(String fileName) {
        try {
            return MAPPER.readValue(resolve(fileName), List.class);
        } catch (Exception e) {
            throw new FrameworkException("Failed to parse JSON: " + fileName, e);
        }
    }

    /**
     * Convert a list of POJOs into the {@code Object[][]} shape a TestNG
     * {@code @DataProvider} returns — one object per row.
     */
    public static <T> Object[][] toDataProvider(List<T> rows) {
        Object[][] data = new Object[rows.size()][1];
        for (int i = 0; i < rows.size(); i++) {
            data[i][0] = rows.get(i);
        }
        return data;
    }
}
