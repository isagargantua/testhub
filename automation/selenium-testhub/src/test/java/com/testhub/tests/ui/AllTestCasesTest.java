package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.enums.Priority;
import com.testhub.pages.AllTestCasesPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.FileDownloadUtils;
import com.testhub.utils.TestDataFactory;
import org.apache.commons.io.FileUtils;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.File;

public class AllTestCasesTest extends BaseTest {

    private ProjectDto project;
    private TestCaseDto testCase;

    @BeforeMethod(alwaysRun = true)
    public void seedLibraryAndSignIn() {
        ApiClient api = loginAsTester();
        project = api.createProject(TestDataFactory.projectName(), "seed");
        SuiteDto suite = api.createSuite(project.id, TestDataFactory.suiteName(), "seed");
        testCase = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.HIGH);
    }

    @Test(groups = {"smoke", "library"},
            description = "A seeded case shows up in the cross-project library and is searchable")
    public void shouldFindCaseInLibrary() {
        AllTestCasesPage page = new AllTestCasesPage().open().search(testCase.title);
        Assert.assertTrue(page.isCaseVisible(testCase.title), "Seeded case should be searchable");
    }

    @Test(groups = {"regression", "library"},
            description = "Filtering by project narrows the library to that project's cases")
    public void shouldFilterByProject() {
        AllTestCasesPage page = new AllTestCasesPage().open().filterByProject(project.name);
        Assert.assertTrue(page.isCaseVisible(testCase.title),
                "Case should remain visible under its own project filter");
    }

    @Test(groups = {"regression", "library"},
            description = "An unmatched search shows the empty state")
    public void shouldShowEmptyStateForNoMatch() {
        AllTestCasesPage page = new AllTestCasesPage().open().search("zzz-no-such-case-" + System.nanoTime());
        Assert.assertTrue(page.isEmptyStateShown(), "Empty state should appear for no matches");
    }

    @Test(groups = {"regression", "library", "export"},
            description = "Exporting the library as CSV downloads a non-empty file containing the case")
    public void shouldExportCsv() throws Exception {
        FileDownloadUtils.clearDownloads();
        AllTestCasesPage page = new AllTestCasesPage().open().search(testCase.title);
        page.clickExportCsv();

        File csv = FileDownloadUtils.waitForDownload("csv");
        Assert.assertTrue(csv.length() > 0, "CSV export should not be empty");
        String content = FileUtils.readFileToString(csv, "UTF-8");
        Assert.assertTrue(content.contains(testCase.title),
                "CSV should contain the exported case title");
    }

    @Test(groups = {"regression", "library", "export"},
            description = "Exporting the library as JSON downloads a non-empty file containing the case")
    public void shouldExportJson() throws Exception {
        FileDownloadUtils.clearDownloads();
        AllTestCasesPage page = new AllTestCasesPage().open().search(testCase.title);
        page.clickExportJson();

        File json = FileDownloadUtils.waitForDownload("json");
        Assert.assertTrue(json.length() > 0, "JSON export should not be empty");
        String content = FileUtils.readFileToString(json, "UTF-8");
        Assert.assertTrue(content.contains(testCase.title),
                "JSON should contain the exported case title");
    }
}
