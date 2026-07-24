/**
 * TAPD — Reservation Card
 * Expo Go safe — replaced LinearGradient with View
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, shadows } from "../constants/theme";
import type { StoredRoomKey } from "../lib/secureKeyStore";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ReservationCard({ keyData }: { keyData: StoredRoomKey }) {
  return (
    <View style={[styles.card, shadows.card]}>
      <View style={styles.topRow}>
        <View style={styles.chip} />
        <View>
          <Text style={styles.brand}>TAPD</Text>
          <Text style={styles.cardSubtitle}>Digital Room Key</Text>
        </View>
      </View>

      <Text style={styles.roomLabel}>Room</Text>
      <Text style={styles.roomNumber}>{keyData.roomNumber}</Text>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{formatDate(keyData.checkIn)}</Text>
        </View>
        <View style={styles.dateArrow} />
        <View>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{formatDate(keyData.checkOut)}</Text>
        </View>
      </View>

      <Text style={styles.hotelName}>{keyData.hotelName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 0.5,
    borderColor: "rgba(201,169,110,0.35)",
    backgroundColor: "#1E3050",
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  chip: {
    width: 36, height: 26, borderRadius: 5,
    backgroundColor: "rgba(201,169,110,0.18)",
    borderWidth: 0.5, borderColor: "rgba(201,169,110,0.5)",
    marginRight: 12,
  },
  brand: { color: colors.gold, fontSize: 13, fontWeight: "600", letterSpacing: 3 },
  cardSubtitle: { color: colors.warm, fontSize: 12, opacity: 0.6, marginTop: 2 },
  roomLabel: { color: colors.warmMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  roomNumber: { color: colors.warm, fontSize: 44, fontWeight: "300", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(201,169,110,0.15)", marginVertical: 20 },
  bottomRow: { flexDirection: "row", alignItems: "center" },
  dateLabel: { color: colors.warmMuted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  dateValue: { color: colors.warm, fontSize: 16, fontWeight: "400" },
  dateArrow: { width: 24, height: 1, backgroundColor: colors.warmFaint, marginHorizontal: 16 },
  hotelName: { color: colors.warmMuted, fontSize: 12, marginTop: 20 },
});
