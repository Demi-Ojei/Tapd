import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "../../constants/theme";
import { getAdminSession } from "../../lib/secureKeyStore";

export default function AdminHomeScreen() {
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) {
      router.replace("/(admin)/login");
      return;
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Admin</Text>
        <Text style={styles.headerSub}>Manage zones, staff, and master keys</Text>

        <View style={styles.guidedCard}>
          <Text style={styles.guidedEyebrow}>Get started</Text>
          <Text style={styles.guidedTitle}>Add your first zone</Text>
          <Text style={styles.guidedBody}>
            A zone is any lockable area — a guest floor, the pool, the gym, a staff entrance.
            Set up your zones first, then add staff and assign access.
          </Text>
          <Pressable style={styles.guidedButton} onPress={() => router.push("/(admin)/zones/new")}>
            <Text style={styles.guidedButtonText}>Add a zone</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Manage</Text>
        <AdminRow title="Zones" subtitle="Floors, amenities, and staff-only areas" onPress={() => {}} />
        <AdminRow title="Staff members" subtitle="Housekeeping, maintenance, front desk, managers" onPress={() => {}} />
        <AdminRow title="Master keys" subtitle="Issue or revoke staff access" onPress={() => {}} />
        <AdminRow title="Access log" subtitle="Every door opened, by whom, when" onPress={() => {}} />
      </ScrollView>
    </View>
  );
}

function AdminRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={styles.adminRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.adminRowTitle}>{title}</Text>
        <Text style={styles.adminRowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  centered: { alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 64, paddingBottom: 80 },
  headerTitle: { color: colors.warm, fontSize: 26, fontWeight: "300" },
  headerSub: { color: colors.warmMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.xl },
  guidedCard: {
    backgroundColor: colors.navy50, borderRadius: radius.lg,
    borderWidth: 1, borderColor: "rgba(201,169,110,0.25)",
    padding: spacing.lg, marginBottom: spacing.xl,
  },
  guidedEyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.sm },
  guidedTitle: { color: colors.warm, fontSize: 19, fontWeight: "400", marginBottom: spacing.sm },
  guidedBody: { color: colors.warmMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  guidedButton: { backgroundColor: colors.gold, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  guidedButtonText: { color: colors.navy, fontWeight: "600", fontSize: 14 },
  sectionLabel: { color: colors.warmMuted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.md },
  adminRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.navy50,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navy200,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  adminRowTitle: { color: colors.warm, fontSize: 15, fontWeight: "500" },
  adminRowSubtitle: { color: colors.warmMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.warmMuted, fontSize: 22 },
});
