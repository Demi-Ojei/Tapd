/**
 * TAPD — Guest Home Screen
 * Expo Go safe — no native dependencies
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "../../constants/theme";
import { ReservationCard } from "../../components/ReservationCard";
import { UnlockButton } from "../../components/UnlockButton";
import { useUnlockDoor } from "../../lib/useUnlockDoor";
import { getRoomKey, type StoredRoomKey } from "../../lib/secureKeyStore";

const CURRENT_RESERVATION_ID = 1;

export default function GuestHomeScreen() {
  const [keyData, setKeyData] = useState<StoredRoomKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { status, message, unlock, reset } = useUnlockDoor();

  const loadKey = useCallback(async () => {
    const stored = await getRoomKey(CURRENT_RESERVATION_ID);
    setKeyData(stored);
    setLoading(false);
  }, []);

  useEffect(() => { loadKey(); }, [loadKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadKey();
    setRefreshing(false);
  }, [loadKey]);

  const handleUnlock = useCallback(async () => {
    if (!keyData) return;
    const result = await unlock(keyData);
    setTimeout(reset, result.status === "granted" ? 2500 : 2000);
  }, [keyData, unlock, reset]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandWordmark}>Tapd</Text>
            <Text style={styles.brandTagline}>Access made easy</Text>
          </View>
        </View>

        {/* Links row */}
        <View style={styles.linksRow}>
          <Pressable onPress={() => router.push("/(guest)/how-it-works")}>
            <Text style={styles.linkText}>How it works</Text>
          </Pressable>
          <Text style={styles.linkDivider}>·</Text>
          <Pressable onPress={() => router.push("/(admin)/login")}>
            <Text style={styles.linkText}>Admin login</Text>
          </Pressable>
        </View>

        {!keyData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No upcoming stay</Text>
            <Text style={styles.emptyBody}>
              Your room key will appear here automatically once your hotel checks you in.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Your stay</Text>
            <ReservationCard keyData={keyData} />

            <View style={styles.unlockSection}>
              <UnlockButton status={status} onPress={handleUnlock} />
              {message ? (
                <Text style={[
                  styles.statusMessage,
                  {
                    color: status === "denied" || status === "error"
                      ? colors.danger
                      : status === "granted"
                      ? colors.success
                      : colors.warmMuted
                  }
                ]}>{message}</Text>
              ) : (
                <Text style={styles.unlockHint}>
                  Hold your phone near the door reader after tapping
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  centered: { alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 64, paddingBottom: 80 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  brandWordmark: { color: colors.warm, fontSize: 26, fontWeight: "300" },
  brandTagline: { color: colors.goldDim, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  linkText: {
    color: colors.gold,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  linkDivider: {
    color: colors.warmFaint,
    fontSize: 13,
  },
  sectionLabel: { color: colors.warmMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.md },
  unlockSection: { alignItems: "center", marginTop: spacing.xxl },
  statusMessage: { marginTop: spacing.lg, fontSize: 14, textAlign: "center" },
  unlockHint: { marginTop: spacing.lg, fontSize: 13, color: colors.warmMuted, textAlign: "center" },
  emptyState: { marginTop: 80, alignItems: "center", paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.warm, fontSize: 18, fontWeight: "300", marginBottom: spacing.sm },
  emptyBody: { color: colors.warmMuted, fontSize: 14, textAlign: "center", lineHeight: 21 },
});
