package com.testhub.utils;

import com.testhub.config.ConfigManager;
import com.testhub.constants.FrameworkConstants;
import com.testhub.exceptions.FrameworkException;

import java.io.File;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Optional;

/** Helpers for asserting on browser file downloads (CSV/JSON export tests). */
public final class FileDownloadUtils {

    private FileDownloadUtils() {
    }

    public static File downloadDir() {
        File dir = new File(FrameworkConstants.DOWNLOAD_DIR);
        dir.mkdirs();
        return dir;
    }

    public static void clearDownloads() {
        File[] files = downloadDir().listFiles();
        if (files != null) {
            Arrays.stream(files).forEach(File::delete);
        }
    }

    /**
     * Waits until a file with the given extension appears (and is not a partial
     * {@code .crdownload}/{@code .part}) in the download folder.
     */
    public static File waitForDownload(String extension) {
        Duration timeout = ConfigManager.explicitTimeout();
        Instant deadline = Instant.now().plus(timeout);
        while (Instant.now().isBefore(deadline)) {
            Optional<File> complete = newestCompleteFile(extension);
            if (complete.isPresent()) {
                return complete.get();
            }
            sleep();
        }
        throw new FrameworkException("No completed ." + extension
                + " download appeared within " + timeout.getSeconds() + "s in " + downloadDir());
    }

    private static Optional<File> newestCompleteFile(String extension) {
        File[] files = downloadDir().listFiles((dir, name) ->
                name.toLowerCase().endsWith("." + extension.toLowerCase()));
        if (files == null || files.length == 0) {
            return Optional.empty();
        }
        boolean stillDownloading = Arrays.stream(downloadDir().listFiles())
                .anyMatch(f -> f.getName().endsWith(".crdownload") || f.getName().endsWith(".part"));
        if (stillDownloading) {
            return Optional.empty();
        }
        return Arrays.stream(files).max(Comparator.comparingLong(File::lastModified));
    }

    private static void sleep() {
        try {
            Thread.sleep(250);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
