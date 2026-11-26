package com.hayatai.app;

import android.os.Bundle;
import android.webkit.ValueCallback;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(FileExportPlugin.class);
        registerPlugin(SmartReminderPlugin.class);
        super.onCreate(savedInstanceState);

        // Native step-by-step Android Back Button handling (Android 8 - 15)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "(function() { return (window.__hayatHandleBackPress && window.__hayatHandleBackPress()) || 'unhandled'; })();",
                            new ValueCallback<String>() {
                                @Override
                                public void onReceiveValue(String value) {
                                    // evaluateJavascript wraps strings in quotes, e.g. "\"handled\"" or "\"exit\""
                                    String clean = value != null ? value.replace("\"", "").trim() : "";
                                    if ("exit".equalsIgnoreCase(clean)) {
                                        finish();
                                    } else if ("handled".equalsIgnoreCase(clean) || "warn_exit".equalsIgnoreCase(clean)) {
                                        // Consumed cleanly in JS web view
                                    } else {
                                        // Fallback if JS handler not mounted yet
                                        setEnabled(false);
                                        MainActivity.super.onBackPressed();
                                        setEnabled(true);
                                    }
                                }
                            }
                        );
                    } else {
                        setEnabled(false);
                        MainActivity.super.onBackPressed();
                        setEnabled(true);
                    }
                } catch (Exception e) {
                    setEnabled(false);
                    MainActivity.super.onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }
}
