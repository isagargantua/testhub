package com.testhub.pages;

import com.testhub.driver.DriverManager;
import com.testhub.utils.JavaScriptUtils;
import com.testhub.utils.WaitUtils;
import com.testhub.utils.XPathUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openqa.selenium.By;
import org.openqa.selenium.ElementClickInterceptedException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Select;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Base class for every page object. Centralises the low-level Selenium
 * interaction so concrete pages read as business intent ("create a project"),
 * never as raw {@code findElement/click} plumbing. Every interaction waits
 * explicitly, so callers never sprinkle waits or sleeps.
 */
public abstract class BasePage {

    protected final Logger log = LogManager.getLogger(getClass());

    protected WebDriver driver() {
        return DriverManager.getDriver();
    }

    // --- interactions --------------------------------------------------------

    protected void click(By locator) {
        WebElement element = WaitUtils.waitForClickable(locator);
        try {
            element.click();
        } catch (ElementClickInterceptedException e) {
            // An overlay/animation got in the way — fall back to a JS click.
            JavaScriptUtils.clickWithJs(element);
        }
    }

    protected void click(WebElement element) {
        try {
            WaitUtils.waitForClickable(element).click();
        } catch (ElementClickInterceptedException e) {
            JavaScriptUtils.clickWithJs(element);
        }
    }

    protected void type(By locator, String text) {
        WebElement element = WaitUtils.waitForVisible(locator);
        element.clear();
        if (text != null && !text.isEmpty()) {
            element.sendKeys(text);
        }
    }

    protected String getText(By locator) {
        return WaitUtils.waitForVisible(locator).getText().trim();
    }

    protected String getValue(By locator) {
        return WaitUtils.waitForVisible(locator).getDomProperty("value");
    }

    protected void selectByValue(By locator, String value) {
        new Select(WaitUtils.waitForVisible(locator)).selectByValue(value);
    }

    protected void selectByVisibleText(By locator, String text) {
        new Select(WaitUtils.waitForVisible(locator)).selectByVisibleText(text);
    }

    protected List<WebElement> findAll(By locator) {
        return driver().findElements(locator);
    }

    protected List<String> getTexts(By locator) {
        return findAll(locator).stream()
                .map(WebElement::getText)
                .map(String::trim)
                .collect(Collectors.toList());
    }

    // --- state queries -------------------------------------------------------

    protected boolean isDisplayed(By locator) {
        try {
            return WaitUtils.waitForVisible(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isPresent(By locator) {
        return WaitUtils.isPresent(locator);
    }

    protected void waitForReady() {
        WaitUtils.waitForPageReady();
    }

    // --- shared locator builders --------------------------------------------
    // All dynamic text goes through XPathUtil.quote() so names containing
    // quotes (Faker loves apostrophes) can never produce an invalid XPath.

    /**
     * Locates a form control by its visible label. Works for the in-app modal
     * forms, where the control is the label's direct following sibling.
     */
    protected By fieldByLabel(String label) {
        return By.xpath("//label[normalize-space()=" + XPathUtil.quote(label)
                + "]/following-sibling::*[self::input or self::textarea or self::select][1]");
    }

    protected By buttonByText(String text) {
        return By.xpath("//button[normalize-space()=" + XPathUtil.quote(text) + "]");
    }
}
