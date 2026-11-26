package com.hayatai.app;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileExport")
public class FileExportPlugin extends Plugin {

    @PluginMethod
    public void saveAndShareFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("base64Data is required");
            return;
        }

        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "export_" + System.currentTimeMillis();
        }

        if (mimeType == null || mimeType.trim().isEmpty()) {
            mimeType = "application/octet-stream";
        }

        final String finalFileName = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
        final String finalMimeType = mimeType;
        final String rawBase64 = base64Data;

        // Perform decoding, validation and file writing on a background thread
        new Thread(() -> {
            try {
                // 1. Strip ANY Data-URI prefix reliably by slicing after the first comma and trimming whitespace
                String cleanBase64 = rawBase64.trim();
                int commaIdx = cleanBase64.indexOf(',');
                if (commaIdx != -1) {
                    cleanBase64 = cleanBase64.substring(commaIdx + 1);
                }
                cleanBase64 = cleanBase64.trim().replaceAll("\\s+", "");

                byte[] fileBytes;
                try {
                    fileBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                } catch (IllegalArgumentException e) {
                    call.reject("Invalid Base64 payload: " + e.getMessage());
                    return;
                }

                // 2. Validate binary integrity BEFORE writing or sharing
                if (fileBytes == null || fileBytes.length == 0) {
                    call.reject("Decoded file byte array is empty");
                    return;
                }

                if ("image/png".equalsIgnoreCase(finalMimeType)) {
                    if (fileBytes.length < 8) {
                        call.reject("Invalid PNG file: file is too small");
                        return;
                    }
                    if (fileBytes[0] != (byte) 0x89 || fileBytes[1] != (byte) 0x50 ||
                        fileBytes[2] != (byte) 0x4E || fileBytes[3] != (byte) 0x47) {
                        call.reject("Invalid PNG signature: corrupted file data");
                        return;
                    }
                } else if ("application/pdf".equalsIgnoreCase(finalMimeType)) {
                    if (fileBytes.length < 4) {
                        call.reject("Invalid PDF file: file is too small");
                        return;
                    }
                    if (fileBytes[0] != (byte) 0x25 || fileBytes[1] != (byte) 0x50 ||
                        fileBytes[2] != (byte) 0x44 || fileBytes[3] != (byte) 0x46) {
                        call.reject("Invalid PDF signature: missing %PDF header");
                        return;
                    }
                }

                // 3. Write file to cache/exports directory ensuring it is flushed & closed via try-with-resources
                File exportDir = new File(getContext().getCacheDir(), "exports");
                if (!exportDir.exists()) {
                    exportDir.mkdirs();
                }

                File exportFile = new File(exportDir, finalFileName);
                try (FileOutputStream fos = new FileOutputStream(exportFile)) {
                    fos.write(fileBytes);
                    fos.flush();
                }

                // 4. On Android 10+ (Q+), also save a copy to public Downloads with MediaStore IS_PENDING handling
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    Uri downloadUri = null;
                    ContentResolver resolver = getContext().getContentResolver();
                    try {
                        ContentValues contentValues = new ContentValues();
                        contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, finalFileName);
                        contentValues.put(MediaStore.MediaColumns.MIME_TYPE, finalMimeType);
                        contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/HayatAI");
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);

                        downloadUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                        if (downloadUri != null) {
                            try (OutputStream out = resolver.openOutputStream(downloadUri)) {
                                if (out != null) {
                                    out.write(fileBytes);
                                    out.flush();
                                }
                            }
                            ContentValues completedValues = new ContentValues();
                            completedValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                            resolver.update(downloadUri, completedValues, null, null);
                        }
                    } catch (Throwable mediaEx) {
                        // Safe cleanup if pending write failed
                        if (downloadUri != null) {
                            try {
                                resolver.delete(downloadUri, null, null);
                            } catch (Throwable ignored) {}
                        }
                    }
                }

                // 5. Generate FileProvider URI and launch share chooser
                String authority = getContext().getPackageName() + ".fileprovider";
                Uri contentUri = FileProvider.getUriForFile(getContext(), authority, exportFile);

                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(finalMimeType);
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, finalFileName);
                shareIntent.setClipData(ClipData.newRawUri(finalFileName, contentUri));
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(shareIntent, finalFileName);
                chooser.setClipData(ClipData.newRawUri(finalFileName, contentUri));
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                getContext().startActivity(chooser);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", exportFile.getAbsolutePath());
                call.resolve(ret);

            } catch (Exception e) {
                call.reject("Failed to save and share file: " + e.getMessage(), e);
            }
        }).start();
    }
}
