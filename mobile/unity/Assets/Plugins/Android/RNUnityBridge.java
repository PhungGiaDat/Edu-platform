package com.unity3d.player;

/** Public facade that keeps Unity 6 GameActivity internals inside unityLibrary. */
public final class RNUnityBridge {
    private RNUnityBridge() {}

    public static void sendMessageToUnity(String targetObject, String targetMethod, String message) {
        UnityPlayer.UnitySendMessage(targetObject, targetMethod, message);
    }

    public static boolean isRunning() {
        return RNUnityPlayerActivity.isRunning();
    }

    public static void closeUnity() {
        RNUnityPlayerActivity.closeUnity();
    }
}
