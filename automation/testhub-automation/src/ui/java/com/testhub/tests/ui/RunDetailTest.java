package com.testhub.tests.ui;

import com.testhub.enums.ResultStatus;
import com.testhub.pages.RunDetailPage;
import com.testhub.pages.TestRunsPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.List;

/**
 * Pure-UI coverage of the Run Detail screen ({@code /runs/:id}). The E2E journey
 * marks a single PASS; this additionally proves a result can be <b>overwritten</b>
 * (the API upserts on {@code [runId, testCaseId]}) and that the summary tiles
 * track the change.
 */
public class RunDetailTest extends BaseTest {

    @Test(groups = {"regression", "runs", "results"},
            description = "Marking a case updates its badge and the summary; re-marking overwrites it")
    public void shouldMarkAndOverwriteResult() {
        signInTester();

        String caseTitle = TestDataFactory.testCaseTitle();
        String projectId = seedProjectSuiteCase(
                TestDataFactory.projectName(), TestDataFactory.suiteName(), caseTitle);

        String runName = TestDataFactory.runName();
        RunDetailPage run = new TestRunsPage().open(projectId)
                .createRun(runName, TestDataFactory.sentence(), List.of(caseTitle))
                .openRun(runName);

        // First mark: PASS.
        run.markResult(caseTitle, ResultStatus.PASS);
        Assert.assertEquals(run.getResultStatus(caseTitle), "PASS", "Case should read PASS");
        Assert.assertEquals(run.getSummaryCount("PASS"), 1, "PASS summary should be 1");

        // Overwrite the same case: FAIL. The old PASS must not linger.
        run.markResult(caseTitle, ResultStatus.FAIL);
        Assert.assertEquals(run.getResultStatus(caseTitle), "FAIL", "Case should now read FAIL");
        Assert.assertEquals(run.getSummaryCount("FAIL"), 1, "FAIL summary should be 1");
        Assert.assertEquals(run.getSummaryCount("PASS"), 0, "PASS summary should drop back to 0");
    }
}
