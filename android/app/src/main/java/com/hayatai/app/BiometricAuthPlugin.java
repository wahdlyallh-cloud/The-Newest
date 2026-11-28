package com.hayatai.app;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private int authenticators() {
        return BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    private String reasonFor(int status) {
        if (status == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) return "NONE_ENROLLED";
        if (status == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) return "NO_HARDWARE";
        if (status == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) return "HARDWARE_UNAVAILABLE";
        return status == BiometricManager.BIOMETRIC_SUCCESS ? "" : "BIOMETRIC_UNAVAILABLE";
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        try {
            Context context = getContext();
            int status = BiometricManager.from(context).canAuthenticate(authenticators());
            boolean enrolled = status == BiometricManager.BIOMETRIC_SUCCESS;
            boolean hardware = enrolled || status == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED;
            JSObject result = new JSObject();
            result.put("available", hardware);
            result.put("enrolled", enrolled);
            result.put("biometryType", hardware ? "fingerprint_face" : "none");
            result.put("reason", reasonFor(status));
            result.put("hasFingerprint", hardware && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
            result.put("hasFace", hardware && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q);
            result.put("status", status);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to check biometric availability", error);
        }
    }

    @PluginMethod
    public void authenticate(final PluginCall call) {
        Activity rawActivity = getActivity();
        if (!(rawActivity instanceof FragmentActivity)) {
            JSObject result = new JSObject(); result.put("authenticated", false);
            result.put("error", "Unsupported activity for biometric prompt"); call.resolve(result); return;
        }
        final FragmentActivity activity = (FragmentActivity) rawActivity;
        activity.runOnUiThread(() -> {
            int availability = BiometricManager.from(getContext()).canAuthenticate(authenticators());
            if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
                JSObject result = new JSObject(); result.put("authenticated", false);
                result.put("error", reasonFor(availability)); call.resolve(result); return;
            }
            String title = call.getString("title", "فتح Blomeo");
            String subtitle = call.getString("subtitle", "استخدم بصمة الإصبع أو الوجه");
            String negative = call.getString("negativeButtonText", "إلغاء");
            BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    JSObject value = new JSObject(); value.put("authenticated", true); value.put("error", ""); call.resolve(value);
                }
                @Override public void onAuthenticationError(int code, CharSequence message) {
                    JSObject value = new JSObject(); value.put("authenticated", false);
                    value.put("error", message == null ? "BIOMETRIC_ERROR" : message.toString()); call.resolve(value);
                }
                @Override public void onAuthenticationFailed() { /* Keep the prompt open for another scan. */ }
            };
            try {
                BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), callback);
                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title).setSubtitle(subtitle).setNegativeButtonText(negative)
                        .setAllowedAuthenticators(authenticators()).build();
                prompt.authenticate(info);
            } catch (Exception error) {
                JSObject value = new JSObject(); value.put("authenticated", false);
                value.put("error", error.getMessage() == null ? "BIOMETRIC_PROMPT_FAILED" : error.getMessage()); call.resolve(value);
            }
        });
    }
}
