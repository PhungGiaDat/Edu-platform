import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { unityBridge } from '../bridge/UnityBridgeModule';
import type { ARMessage } from '../bridge/arMessages';
import { COLORS } from '../design/tokens';

export const BridgeDiagnosticScreen: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [lifecycle, setLifecycle] = useState(AppState.currentState);
  const [outgoing, setOutgoing] = useState('-');
  const [incoming, setIncoming] = useState('-');
  const [pingId, setPingId] = useState('-');
  const [pongId, setPongId] = useState('-');
  const [error, setError] = useState('-');
  const [roundTrips, setRoundTrips] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const receivedIds = useRef(new Set<string>());
  const autoSmokeStarted = useRef(false);

  const sendPing = async (requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`) => {
    setPingId(requestId);
    setOutgoing(JSON.stringify({ type: 'PING', requestId }));
    try {
      await unityBridge.sendPing(requestId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', setLifecycle);
    const unsubscribeReady = unityBridge.subscribe('UNITY_READY', () => {
      setReady(true);
      if (!autoSmokeStarted.current) {
        autoSmokeStarted.current = true;
        const burstId = Date.now();
        for (let index = 0; index < 3; index += 1) {
          // Enqueue the full burst synchronously. Android suspends JS timers
          // while the separate Unity Activity owns the foreground.
          void sendPing(`smoke-${burstId}-${index}`);
        }
      }
    });
    const unsubscribePong = unityBridge.subscribe('PONG', (message: ARMessage) => {
      const requestId = String((message.payload as Record<string, unknown> | undefined)?.requestId ?? '');
      setIncoming(JSON.stringify({ type: 'PONG', ...(message.payload ?? {}) }));
      setPongId(requestId || '-');
      if (receivedIds.current.has(requestId)) {
        setDuplicates((value) => value + 1);
      } else {
        receivedIds.current.add(requestId);
        setRoundTrips((value) => value + 1);
      }
    });

    return () => {
      appStateSubscription.remove();
      unsubscribeReady?.();
      unsubscribePong?.();
    };
  }, []);

  const openUnity = async () => {
    setError('-');
    setReady(false);
    autoSmokeStarted.current = false;
    receivedIds.current.clear();
    setRoundTrips(0);
    setDuplicates(0);
    try {
      const launched = await unityBridge.launchUnity();
      setMounted(launched);
      if (!launched) setError('Unity native module unavailable');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const closeUnity = async () => {
    await unityBridge.closeUnity();
    setMounted(false);
  };

  const pass = ready && roundTrips >= 3 && duplicates === 0 && pingId === pongId;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unity Bridge Diagnostics</Text>
      <Diagnostic label="Unity Mounted" value={mounted ? 'YES' : 'NO'} />
      <Diagnostic label="Unity Ready" value={ready ? 'YES' : 'NO'} />
      <Diagnostic label="Lifecycle" value={lifecycle} />
      <Diagnostic label="Last Outgoing Message" value={outgoing} />
      <Diagnostic label="Last Incoming Message" value={incoming} />
      <Diagnostic label="PING requestId" value={pingId} />
      <Diagnostic label="PONG requestId" value={pongId} />
      <Diagnostic label="Sequential PONGs" value={`${roundTrips}/3`} />
      <Diagnostic label="Duplicate PONGs" value={String(duplicates)} />
      <Diagnostic label="Round Trip" value={pass ? 'PASS' : 'WAITING'} />
      <Diagnostic label="Bridge Error" value={error} />

      <View style={styles.controls}>
        <Control label="Open Unity" onPress={() => void openUnity()} />
        <Control label="Send PING" onPress={() => void sendPing()} />
        <Control label="Close Unity" onPress={() => void closeUnity()} />
      </View>
    </ScrollView>
  );
};

const Diagnostic = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text selectable style={styles.value}>{value}</Text>
  </View>
);

const Control = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, backgroundColor: COLORS.backgroundBase, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  row: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12 },
  label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  value: { color: COLORS.textPrimary, fontSize: 14, marginTop: 4 },
  controls: { gap: 10, marginTop: 12 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '800' },
});
