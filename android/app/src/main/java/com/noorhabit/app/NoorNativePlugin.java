package com.noorhabit.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NoorNative")
public class NoorNativePlugin extends Plugin {

    private NoorNativeBridge bridgeImplementation;

    @Override
    public void load() {
        super.load();
        bridgeImplementation = new NoorNativeBridge(getContext());
    }

    private NoorNativeBridge getBridgeImpl() {
        if (bridgeImplementation == null) {
            bridgeImplementation = new NoorNativeBridge(getContext());
        }
        return bridgeImplementation;
    }

    @PluginMethod
    public void getReelsStats(PluginCall call) {
        try {
            String statsJson = getBridgeImpl().getReelsStats();
            JSObject ret = new JSObject(statsJson);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get reels stats: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAppUsageStats(PluginCall call) {
        try {
            String usageJson = getBridgeImpl().getAppUsageStats();
            JSObject ret = new JSObject(usageJson);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get app usage stats: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setReelsThemeColor(PluginCall call) {
        try {
            getBridgeImpl().setReelsThemeColor(call.getString("color", "#8B5CF6"));
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set reels theme color: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setReelsAlertLimit(PluginCall call) {
        try {
            int limit = call.getInt("limit", 30);
            getBridgeImpl().setReelsAlertLimit(limit);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set reels alert limit: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getReelsAlertLimit(PluginCall call) {
        try {
            int limit = getBridgeImpl().getReelsAlertLimit();
            JSObject ret = new JSObject();
            ret.put("limit", limit);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get reels alert limit: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        try {
            getBridgeImpl().openAccessibilitySettings();
            call.resolve();
        } catch (Exception e) {
            call.reject("Error opening accessibility settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            getBridgeImpl().openOverlaySettings();
            call.resolve();
        } catch (Exception e) {
            call.reject("Error opening overlay settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openUsageSettings(PluginCall call) {
        try {
            getBridgeImpl().openUsageSettings();
            call.resolve();
        } catch (Exception e) {
            call.reject("Error opening usage settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            getBridgeImpl().openNotificationSettings();
            call.resolve();
        } catch (Exception e) {
            call.reject("Error opening notification settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void addMockReels(PluginCall call) {
        try {
            int count = call.getInt("count", 1);
            getBridgeImpl().addMockReels(count);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error adding mock reels: " + e.getMessage());
        }
    }
}
