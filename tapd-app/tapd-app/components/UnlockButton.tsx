/**
 * TAPD — Animated Unlock Button
 * Expo Go safe version — no expo-haptics dependency
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { colors, shadows } from "../constants/theme";
import type { UnlockStatus } from "../lib/useUnlockDoor";

interface UnlockButtonProps {
  status: UnlockStatus;
  onPress: () => void;
  disabled?: boolean;
}

const SIZE = 200;

export function UnlockButton({ status, onPress, disabled }: UnlockButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== "idle" && status !== "tap") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status]);

  useEffect(() => {
    if (status !== "granted") return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 180, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [status]);

  useEffect(() => {
    if (status !== "denied" && status !== "error") return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [status]);

  const ringColor =
    status === "granted" ? colors.success :
    status === "denied" || status === "error" ? colors.danger :
    colors.gold;

  const label =
    status === "idle" ? "Unlock Room" :
    status === "checking" ? "Verifying…" :
    status === "tap" ? "Hold near door" :
    status === "granted" ? "Unlocked" :
    "Try again";

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.outerRing, { borderColor: ringColor, transform: [{ scale: pulseAnim }], opacity: 0.25 }]} />
      <Pressable
        onPress={onPress}
        disabled={disabled || status === "checking" || status === "tap"}
        style={({ pressed }) => [styles.button, { borderColor: ringColor, opacity: pressed ? 0.85 : 1 }]}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }}>
          <LockIcon status={status} color={ringColor} />
        </Animated.View>
      </Pressable>
      <Text style={[styles.label, { color: ringColor }]}>{label}</Text>
    </View>
  );
}

function LockIcon({ status, color }: { status: UnlockStatus; color: string }) {
  if (status === "granted") {
    return (
      <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color, fontSize: 40 }}>✓</Text>
      </View>
    );
  }
  return (
    <View style={iconStyles.lockWrap}>
      <View style={[iconStyles.lockShackle, { borderColor: color }]} />
      <View style={[iconStyles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  outerRing: {
    position: "absolute",
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
    borderWidth: 1,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.navy50,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  label: {
    marginTop: 24,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

const iconStyles = StyleSheet.create({
  lockWrap: { width: 56, height: 64, alignItems: "center" },
  lockShackle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderBottomWidth: 0,
    marginBottom: -8,
  },
  lockBody: {
    width: 56,
    height: 40,
    borderRadius: 8,
  },
});
