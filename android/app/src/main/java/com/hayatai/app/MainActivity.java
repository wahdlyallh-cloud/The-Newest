package com.hayatai.app;

import android.os.Bundle;
import android.content.Intent;
import android.webkit.ValueCallback;
import org.json.JSONObject;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static String pendingQuickAction;
    private static void captureQuickAction(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("blomeo_shortcut_action");
        if (action == null) action = intent.getStringExtra("hayat_quick_action");
        if (action != null && !action.isEmpty()) {
            synchronized (MainActivity.class) { pendingQuickAction = action; }
            intent.removeExtra("blomeo_shortcut_action");
            intent.removeExtra("hayat_quick_action");
        }
    }
    private void dispatchPendingShortcut() {
        final String action;
        synchronized (MainActivity.class) { action = pendingQuickAction; }
        if (action == null || getBridge() == null || getBridge().getWebView() == null) return;
        final String safeAction = JSONObject.quote(action);
        getBridge().getWebView().postDelayed(() -> getBridge().getWebView().evaluateJavascript(
                "window.__BLOMEO_PENDING_SHORTCUT__ = " + safeAction + ";" +
                "window.dispatchEvent(new CustomEvent('blomeo-shortcut',{detail:{action:" + safeAction + "}}));", null), 500);
    }
    public static synchronized String consumePendingQuickAction() {
        String action = pendingQuickAction;
        pendingQuickAction = null;
        return action;
    }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(FileExportPlugin.class);
        registerPlugin(SmartReminderPlugin.class);
        registerPlugin(BiometricAuthPlugin.class);
        captureQuickAction(getIntent());
        super.onCreate(savedInstanceState);

        // Native step-by-step Android Back Button handling (Android 8 - 15)
        dispatchPendingShortcut();
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

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureQuickAction(intent);
        dispatchPendingShortcut();
    }

    @Override
    public void onResume() {
        super.onResume();
        PersistentNotificationHelper.restoreIfEnabled(this);
        dispatchPendingShortcut();
    }
}
