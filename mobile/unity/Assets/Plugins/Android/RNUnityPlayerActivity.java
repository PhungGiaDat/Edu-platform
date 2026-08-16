package com.unity3d.player;

import android.os.Bundle;
import java.lang.ref.WeakReference;

/** Same-package Unity-as-a-Library host used by the React Native application. */
public class RNUnityPlayerActivity extends UnityPlayerGameActivity {
    private static WeakReference<RNUnityPlayerActivity> current = new WeakReference<>(null);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        current = new WeakReference<>(this);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onDestroy() {
        current.clear();
        super.onDestroy();
    }

    public static boolean isRunning() {
        return current.get() != null;
    }

    public static void closeUnity() {
        RNUnityPlayerActivity activity = current.get();
        if (activity != null) {
            activity.runOnUiThread(activity::finish);
        }
    }

    @Override
    public void onUnityPlayerUnloaded() {
        finish();
    }

    @Override
    public void onBackPressed() {
        finish();
    }
}
