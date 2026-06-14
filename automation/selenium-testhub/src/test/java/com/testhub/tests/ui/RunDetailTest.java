package com.testhub.tests.ui;

import com.testhub.api.ApiClient;
import com.testhub.api.models.ProjectDto;
import com.testhub.api.models.RunDto;
import com.testhub.api.models.SuiteDto;
import com.testhub.api.models.TestCaseDto;
import com.testhub.enums.Priority;
import com.testhub.enums.ResultStatus;
import com.testhub.enums.RunStatus;
import com.testhub.pages.RunDetailPage;
import com.testhub.tests.BaseTest;
import com.testhub.utils.TestDataFactory;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.util.List;

/**
 * Result recording inside a run. The whole project/suite/cases/run graph is
 * seeded over the API, so each test starts one click away from the assertion.
 */
public class RunDetailTest extends BaseTest {

    private RunDto run;
    private TestCaseDto case1;
    private TestCaseDto case2;
    private TestCaseDto extraCase;

    @BeforeMethod(alwaysRun = true)
    public void seedRunAndSignIn() {
        ApiClient api = loginAsTester();
        ProjectDto project = api.createProject(TestDataFactory.projectName(), "seed");
        SuiteDto suite = api.createSuite(project.id, TestDataFactory.suiteName(), "seed");
        this.case1 = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.HIGH);
        this.case2 = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.MEDIUM);
        this.extraCase = api.createTestCase(suite.id, TestDataFactory.testCaseTitle(), Priority.LOW);
        this.run = api.createRun(project.id, TestDataFactory.runName(), List.of(case1.id, case2.id));
    }

    @Test(groups = {"smoke", "runs"},
            description = "Marking a case PASS updates its badge and the PASS summary tile")
    public void shouldMarkResultAndUpdateSummary() {
        RunDetailPage detail = new RunDetailPage().open(run.id)
                .markResult(case1.title, ResultStatus.PASS);
        Assert.assertEquals(detail.getResultStatus(case1.title), "PASS",
                "Case badge should read PASS");
        Assert.assertEquals(detail.getSummaryCount("PASS"), 1, "PASS tile should count 1");
    }

    @Test(groups = {"regression", "runs"},
            description = "Different cases can hold different result statuses simultaneously")
    public void shouldRecordMixedResults() {
        RunDetailPage detail = new RunDetailPage().open(run.id)
                .markResult(case1.title, ResultStatus.PASS)
                .markResult(case2.title, ResultStatus.FAIL);
        Assert.assertEquals(detail.getResultStatus(case1.title), "PASS");
        Assert.assertEquals(detail.getResultStatus(case2.title), "FAIL");
        Assert.assertEquals(detail.getSummaryCount("PASS"), 1);
        Assert.assertEquals(detail.getSummaryCount("FAIL"), 1);
    }

    @Test(groups = {"regression", "runs"},
            description = "Re-marking a case overwrites the previous result (upsert)")
    public void shouldOverwriteResultOnRemark() {
        RunDetailPage detail = new RunDetailPage().open(run.id)
                .markResult(case1.title, ResultStatus.PASS)
                .markResult(case1.title, ResultStatus.BLOCKED);
        Assert.assertEquals(detail.getResultStatus(case1.title), "BLOCKED",
                "Latest mark wins");
        Assert.assertEquals(detail.getSummaryCount("PASS"), 0, "Old PASS should be cleared");
        Assert.assertEquals(detail.getSummaryCount("BLOCKED"), 1);
    }

    @Test(groups = {"regression", "runs"},
            description = "The run status can be changed from the detail view")
    public void shouldChangeRunStatus() {
        RunDetailPage detail = new RunDetailPage().open(run.id).setRunStatus(RunStatus.COMPLETED);
        Assert.assertEquals(detail.getRunStatus(), RunStatus.COMPLETED.name(),
                "Run-status select should hold the new value");
    }

    @Test(groups = {"regression", "runs"},
            description = "More test cases can be added to an existing run")
    public void shouldAddTestCasesToRun() {
        RunDetailPage detail = new RunDetailPage().open(run.id)
                .openAddCasesModal()
                .addCaseByTitle(extraCase.title);
        Assert.assertEquals(detail.getResultStatus(extraCase.title), "PENDING",
                "Newly added case should start as PENDING");
    }
}
