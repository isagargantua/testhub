package com.testhub.utils;

import com.testhub.constants.FrameworkConstants;
import com.testhub.exceptions.FrameworkException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileInputStream;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads {@code .xlsx} spreadsheets into a list of row maps (header → value),
 * giving the framework an Excel-driven data source in addition to JSON/CSV.
 * The first row of the sheet is treated as the header.
 */
public final class ExcelDataReader {

    private static final DataFormatter FORMATTER = new DataFormatter();

    private ExcelDataReader() {
    }

    public static List<Map<String, String>> read(String fileName, String sheetName) {
        String path = Paths.get(FrameworkConstants.TEST_DATA_DIR, fileName).toString();
        List<Map<String, String>> rows = new ArrayList<>();

        try (FileInputStream fis = new FileInputStream(path);
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                throw new FrameworkException("Sheet '" + sheetName + "' not found in " + fileName);
            }

            Row header = sheet.getRow(0);
            if (header == null) {
                return rows;
            }
            List<String> headers = new ArrayList<>();
            for (Cell cell : header) {
                headers.add(FORMATTER.formatCellValue(cell).trim());
            }

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                Map<String, String> rowMap = new LinkedHashMap<>();
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c);
                    rowMap.put(headers.get(c), cell == null ? "" : FORMATTER.formatCellValue(cell).trim());
                }
                rows.add(rowMap);
            }
        } catch (FrameworkException fe) {
            throw fe;
        } catch (Exception e) {
            throw new FrameworkException("Failed to read Excel file: " + fileName, e);
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
}
