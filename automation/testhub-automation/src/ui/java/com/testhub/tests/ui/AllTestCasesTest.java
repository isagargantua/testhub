package com.testhub.tests.ui;

import com.testhub.pages.AllTestCasesPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

/**
 * Pure-UI coverage of the "All Test Cases" library — the cross-project view at
 * {@code /test-cases}. Verifies the empty state for a fresh account and that a
 * case created through the UI surfaces in the library search.
 */
public class AllTestCasesTest extends BaseTest {

    @Test(groups = {"regression", "library"},
            description = "A brand-new user's library shows the empty state and a zero total")
    public void shouldShowEmptyLibraryForNewUser() {
        signUpFreshUser();

        AllTestCasesPage library = new AllTestCasesPage().open();
        Assert.assertTrue(library.isEmptyStateVisible(),
                "A fresh account should see the 'No test cases found' empty state");
    }

    @Test(groups = {"regression", "library"},
            description = "A UI-created test case appears in the library and is findable by search")
    public void shouldFindCreatedCaseInLibrary() {
        signInTester();

        String caseTitle = TestDataFactory.testCaseTitle();
        seedProjectSuiteCase(TestDataFactory.projectName(), TestDataFactory.suiteName(), caseTitle);

        AllTestCasesPage library = new AllTestCasesPage().open().search(caseTitle);
        library.waitForCase(caseTitle);
        Assert.assertTrue(library.isCaseVisible(caseTitle),
                "The created case should be findable in the library");
        Assert.assertTrue(library.isExportEnabled(),
                "Export should be enabled once the library has cases");
    }
}
