package com.noorhabit.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        try {
            String action = intent.getAction();
            if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
                Log.d(TAG, "Noor Habit received BOOT_COMPLETED event");
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error in BootReceiver", t);
        }
    }
}
