package com.hayatai.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = PackageInfoCompat.getLongVersionCode(pInfo);
            String versionName = pInfo.versionName != null ? pInfo.versionName : "1.0.0";

            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            ret.put("versionName", versionName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to retrieve app version: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        // On Android 8.0+ (Oreo), verify permission to install unknown apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            if (!canInstall) {
                try {
                    Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    permIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(permIntent);

                    JSObject ret = new JSObject();
                    ret.put("status", "needs_permission");
                    call.resolve(ret);
                    return;
                } catch (Exception ex) {
                    // Fall back to general security settings if specific intent fails
                    Intent genericIntent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                    genericIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(genericIntent);

                    JSObject ret = new JSObject();
                    ret.put("status", "needs_permission");
                    call.resolve(ret);
                    return;
                }
            }
        }

        // Run download on background worker thread
        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;

            try {
                File cacheDir = new File(getContext().getCacheDir(), "updates");
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs();
                }

                File apkFile = new File(cacheDir, "hayat-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                String currentUrl = downloadUrl;
                int redirectsCount = 0;
                final int MAX_REDIRECTS = 10;

                // Explicitly follow HTTP 301/302/303/307/308 across origins (GitHub to objects.githubusercontent.com)
                while (redirectsCount < MAX_REDIRECTS) {
                    URL targetUrl = new URL(currentUrl);
                    connection = (HttpURLConnection) targetUrl.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(25000);
                    connection.setReadTimeout(45000);
                    connection.setRequestProperty("User-Agent", "HayatAI-Android-AppUpdater");
                    connection.connect();

                    int responseCode = connection.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                        responseCode == 307 ||
                        responseCode == 308) {
                        String newLocation = connection.getHeaderField("Location");
                        if (newLocation == null || newLocation.trim().isEmpty()) {
                            throw new Exception("Redirect header missing in HTTP " + responseCode);
                        }
                        if (newLocation.startsWith("/")) {
                            URL base = new URL(currentUrl);
                            newLocation = base.getProtocol() + "://" + base.getHost() + newLocation;
                        }
                        currentUrl = newLocation;
                        redirectsCount++;
                        connection.disconnect();
                        continue;
                    }

                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        throw new Exception("Server returned HTTP " + responseCode + " " + connection.getResponseMessage());
                    }
                    break;
                }

                if (redirectsCount >= MAX_REDIRECTS) {
                    throw new Exception("Too many redirects during APK download");
                }

                long fileLength = connection.getContentLengthLong();
                input = connection.getInputStream();
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long totalDownloaded = 0;
                int count;
                long lastEmitTime = 0;
                int lastReportedPercent = -1;

                while ((count = input.read(data)) != -1) {
                    totalDownloaded += count;
                    output.write(data, 0, count);

                    int progressPercent = fileLength > 0 ? (int) ((totalDownloaded * 100) / fileLength) : 0;
                    long now = System.currentTimeMillis();

                    // Throttle events: emit if percentage changed and at least 150ms elapsed
                    if (progressPercent != lastReportedPercent && (now - lastEmitTime > 150 || progressPercent == 100)) {
                        lastReportedPercent = progressPercent;
                        lastEmitTime = now;

                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", progressPercent);
                        progressObj.put("downloadedBytes", totalDownloaded);
                        progressObj.put("totalBytes", fileLength > 0 ? fileLength : totalDownloaded);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                output.flush();
                output.close();
                output = null;
                input.close();
                input = null;

                // Final 100% notification
                JSObject finalProgress = new JSObject();
                finalProgress.put("progress", 100);
                finalProgress.put("downloadedBytes", totalDownloaded);
                finalProgress.put("totalBytes", totalDownloaded);
                notifyListeners("downloadProgress", finalProgress);

                // Build FileProvider URI and launch installation
                String authority = getContext().getPackageName() + ".fileprovider";
                Uri apkUri = FileProvider.getUriForFile(getContext(), authority, apkFile);

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(installIntent);

                JSObject res = new JSObject();
                res.put("status", "installing");
                call.resolve(res);

            } catch (Exception e) {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}

                call.reject("APK download or install failed: " + e.getMessage(), e);
            }
        }).start();
    }
}
