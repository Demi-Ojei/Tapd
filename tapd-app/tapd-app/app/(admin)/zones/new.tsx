import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "../../../constants/theme";

const ZONE_TYPES = [
  { value: "guest_floor", label: "Guest floor", hint: "e.g. Floor 3" },
  { value: "amenity", label: "Amenity", hint: "Pool, gym, lounge" },
  { value: "utility", label: "Utility", hint: "Laundry, storage" },
  { value: "staff_only", label: "Staff only", hint: "Back entrance, offices" },
] as const;

export default function NewZoneScreen() {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<typeof ZONE_TYPES[number]["value"]>("guest_floor");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Add a zone</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.explainerCard}>
          <Text style={styles.explainerText}>
            A zone is any space at your property that needs a lock — a guest floor, the pool, the gym, a staff entrance. Staff access is assigned by zone.
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Zone name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Floor 3, Pool Area, Staff Entrance…" placeholderTextColor={colors.warmFaint} />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Zone type</Text>
        <View style={styles.typeGrid}>
          {ZONE_TYPES.map(type => (
            <Pressable key={type.value} style={[styles.typeCard, selectedType === type.value && styles.typeCardActive]} onPress={() => setSelectedType(type.value)}>
              <Text style={[styles.typeCardLabel, selectedType === type.value && styles.typeCardLabelActive]}>{type.label}</Text>
              <Text style={styles.typeCardHint}>{type.hint}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]} onPress={() => router.back()} disabled={!name.trim()}>
          <Text style={styles.saveBtnText}>Save zone</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  backArrow: { color: colors.warm, fontSize: 32, fontWeight: "300" },
  headerTitle: { color: colors.warm, fontSize: 16, fontWeight: "500" },
  explainerCard: { backgroundColor: colors.navy50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navy200, padding: spacing.md, marginBottom: spacing.xl },
  explainerText: { color: colors.warmMuted, fontSize: 13, lineHeight: 19 },
  fieldLabel: { color: colors.warmMuted, fontSize: 12, marginBottom: spacing.sm },
  input: { backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy200, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.warm, fontSize: 15 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeCard: { width: "47%", backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy200, borderRadius: radius.md, padding: spacing.md },
  typeCardActive: { borderColor: colors.gold, backgroundColor: "rgba(201,169,110,0.08)" },
  typeCardLabel: { color: colors.warm, fontSize: 14, fontWeight: "500", marginBottom: 4 },
  typeCardLabelActive: { color: colors.gold },
  typeCardHint: { color: colors.warmMuted, fontSize: 11 },
  saveBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.xl },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.navy, fontWeight: "600", fontSize: 15 },
});
