package com.noorhabit.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.ContextCompat;

public class FloatingReelsOverlay {

    private static final String TAG = "FloatingReelsOverlay";
    private final Context context;
    private final WindowManager windowManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private View overlayView;
    private TextView countTextView;
    private WindowManager.LayoutParams params;
    private boolean isShowing = false;

    public FloatingReelsOverlay(Context context) {
        this.context = context;
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
    }

    private int dpToPx(float dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            context.getResources().getDisplayMetrics()
        );
    }

    public void show(final int reelsCount) {
        mainHandler.post(() -> {
            try {
                // If already showing, update text directly without re-adding view
                if (isShowing && countTextView != null && overlayView != null) {
                    countTextView.setText(String.valueOf(reelsCount));
                    return;
                }

                // If old view exists in WindowManager, cleanly remove it first
                if (overlayView != null && windowManager != null) {
                    try {
                        windowManager.removeViewImmediate(overlayView);
                    } catch (Throwable ignored) {}
                    overlayView = null;
                }

                int layoutFlag;
                if (context instanceof AccessibilityService) {
                    // TYPE_ACCESSIBILITY_OVERLAY is native for Accessibility Services
                    // and does not need special SYSTEM_ALERT_WINDOW permission
                    layoutFlag = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY;
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!hasOverlayPermission()) return;
                    layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
                } else {
                    if (!hasOverlayPermission()) return;
                    layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
                }

                params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                    PixelFormat.TRANSLUCENT
                );

                params.gravity = Gravity.TOP | Gravity.END;
                params.x = dpToPx(12);
                params.y = dpToPx(110); // Below system status bar

                // Ultra-sleek pill container
                LinearLayout container = new LinearLayout(context);
                container.setOrientation(LinearLayout.HORIZONTAL);
                container.setGravity(Gravity.CENTER_VERTICAL);
                container.setPadding(dpToPx(10), dpToPx(6), dpToPx(12), dpToPx(6));

                // Obsidian glass pill with glowing emerald stroke
                GradientDrawable pillBg = new GradientDrawable();
                pillBg.setShape(GradientDrawable.RECTANGLE);
                pillBg.setCornerRadius(dpToPx(24));
                pillBg.setColor(Color.parseColor("#E60F172A")); // Translucent deep slate
                int themeAccent = getThemeAccent();
                pillBg.setStroke(dpToPx(1.5f), themeAccent);
                container.setBackground(pillBg);
                container.setElevation(dpToPx(4));

                // 1. Vector Reel icon
                ImageView reelIcon = new ImageView(context);
                try {
                    int resId = context.getResources().getIdentifier("ic_reel_counter", "drawable", context.getPackageName());
                    if (resId != 0) {
                        reelIcon.setImageDrawable(ContextCompat.getDrawable(context, resId));
                        reelIcon.setColorFilter(themeAccent);
                    } else {
                        reelIcon.setImageResource(android.R.drawable.ic_media_play);
                    }
                } catch (Throwable t) {
                    reelIcon.setImageResource(android.R.drawable.ic_media_play);
                }

                LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dpToPx(18), dpToPx(18));
                iconParams.setMarginEnd(dpToPx(6));
                reelIcon.setLayoutParams(iconParams);
                container.addView(reelIcon);

                // 2. Crisp bold counting number
                countTextView = new TextView(context);
                countTextView.setText(String.valueOf(reelsCount));
                countTextView.setTextColor(Color.parseColor("#F8FAFC"));
                countTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.5f);
                countTextView.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
                countTextView.setGravity(Gravity.CENTER_VERTICAL);
                container.addView(countTextView);

                // Smooth drag gesture to freely move overlay around the screen
                container.setOnTouchListener(new View.OnTouchListener() {
                    private int initialX, initialY;
                    private float initialTouchX, initialTouchY;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        try {
                            switch (event.getAction()) {
                                case MotionEvent.ACTION_DOWN:
                                    initialX = params.x;
                                    initialY = params.y;
                                    initialTouchX = event.getRawX();
                                    initialTouchY = event.getRawY();
                                    return true;
                                case MotionEvent.ACTION_MOVE:
                                    params.x = initialX - (int) (event.getRawX() - initialTouchX);
                                    params.y = initialY + (int) (event.getRawY() - initialTouchY);
                                    if (windowManager != null && isShowing && overlayView != null) {
                                        windowManager.updateViewLayout(overlayView, params);
                                    }
                                    return true;
                            }
                        } catch (Throwable t) {
                            Log.w(TAG, "Touch event error", t);
                        }
                        return false;
                    }
                });

                overlayView = container;
                windowManager.addView(overlayView, params);
                isShowing = true;
            } catch (Throwable t) {
                Log.e(TAG, "Error in FloatingReelsOverlay.show", t);
            }
        });
    }

    public void updateCount(final int reelsCount) {
        mainHandler.post(() -> {
            try {
                if (countTextView != null && isShowing) {
                    countTextView.setText(String.valueOf(reelsCount));
                }
            } catch (Throwable t) {
                Log.w(TAG, "Error in updateCount", t);
            }
        });
    }

    public void hide() {
        mainHandler.post(() -> {
            try {
                if (overlayView != null && windowManager != null) {
                    try {
                        windowManager.removeViewImmediate(overlayView);
                    } catch (Throwable t) {
                        try {
                            windowManager.removeView(overlayView);
                        } catch (Throwable ignored) {}
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "Error in hide()", t);
            } finally {
                isShowing = false;
                overlayView = null;
                countTextView = null;
            }
        });
    }

    private int getThemeAccent() {
        try {
            String color = context.getSharedPreferences(ReelsTrackingService.PREFS_NAME, Context.MODE_PRIVATE)
                .getString("reels_theme_color", "#8B5CF6");
            return Color.parseColor(color);
        } catch (Throwable ignored) {
            return Color.parseColor("#8B5CF6");
        }
    }

    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }
}
