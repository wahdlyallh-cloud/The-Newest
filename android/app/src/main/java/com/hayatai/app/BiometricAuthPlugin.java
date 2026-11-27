package com.hayatai.app;

import android.content.Context;
import android.os.Build;
import android.app.Activity;
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
        return BiometricManager.Authenticators.BIOMETRIC_STRONG
                | BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        try {
            Context context = getContext();
            int status = BiometricManager.from(context).canAuthenticate(authenticators());
            JSObject result = new JSObject();
            result.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
            result.put("hasFingerprint", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
            result.put("hasFace", Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q);
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
            JSObject ret = new JSObject();
            ret.put("authenticated", false);
            ret.put("error", "Unsupported activity for biometric prompt");
            call.resolve(ret);
            return;
        }
        final FragmentActivity fragmentActivity = (FragmentActivity) rawActivity;
        fragmentActivity.runOnUiThread(() -> {
            String title = call.getString("title", "فتح حياة AI");
            String subtitle = call.getString("subtitle", "استخدم بصمة الإصبع أو الوجه");
            String negative = call.getString("negativeButtonText", "استخدام رمز الدخول");
            BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    JSObject ret = new JSObject(); ret.put("authenticated", true); call.resolve(ret);
                }
                @Override public void onAuthenticationError(int errorCode, CharSequence errString) {
                    JSObject ret = new JSObject(); ret.put("authenticated", false);
                    ret.put("error", errString == null ? "BIOMETRIC_ERROR" : errString.toString()); call.resolve(ret);
                }
                @Override public void onAuthenticationFailed() { /* prompt remains available */ }
            };
            BiometricPrompt prompt = new BiometricPrompt(fragmentActivity, ContextCompat.getMainExecutor(fragmentActivity), callback);
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title).setSubtitle(subtitle).setNegativeButtonText(negative)
                    .setAllowedAuthenticators(authenticators()).build();
            prompt.authenticate(info);
        });
    }
}
