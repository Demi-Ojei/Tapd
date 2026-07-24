import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "../../constants/theme";

const { width } = Dimensions.get("window");

const STEPS = [
  { number: "1", title: "You book a room", body: "The moment your reservation is confirmed, Tapd is notified automatically. Nothing extra for you to do." },
  { number: "2", title: "Your key arrives", body: "A digital room key appears right here in the app, tied to your reservation. No separate download, no setup." },
  { number: "3", title: "Tap and you're in", body: "Hold your phone near the door reader. Tapd checks your key in under a second and the lock opens." },
  { number: "4", title: "It ends automatically", body: "When you check out, your key stops working on its own. Nothing to return, nothing to remember." },
];

export default function HowItWorksScreen() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>How Tapd works</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeStep && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.illustrationBox}>
          <Text style={styles.stepEmoji}>
            {activeStep === 0 ? "📋" : activeStep === 1 ? "📱" : activeStep === 2 ? "🚪" : "✓"}
          </Text>
        </View>

        <Text style={styles.stepNumber}>Step {STEPS[activeStep].number}</Text>
        <Text style={styles.stepTitle}>{STEPS[activeStep].title}</Text>
        <Text style={styles.stepBody}>{STEPS[activeStep].body}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => setActiveStep(s => Math.max(0, s - 1))} disabled={activeStep === 0} style={[styles.navBtn, activeStep === 0 && styles.navBtnDisabled]}>
          <Text style={styles.navBtnText}>Back</Text>
        </Pressable>
        {activeStep < STEPS.length - 1 ? (
          <Pressable onPress={() => setActiveStep(s => s + 1)} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Got it</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backArrow: { color: colors.warm, fontSize: 32, fontWeight: "300" },
  headerTitle: { color: colors.warm, fontSize: 16, fontWeight: "500" },
  content: { flex: 1, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center" },
  dotsRow: { flexDirection: "row", gap: 8, marginBottom: spacing.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy200 },
  dotActive: { backgroundColor: colors.gold, width: 24 },
  illustrationBox: { width: width - 80, height: 160, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  stepEmoji: { fontSize: 72 },
  stepNumber: { color: colors.gold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.sm },
  stepTitle: { color: colors.warm, fontSize: 24, fontWeight: "300", marginBottom: spacing.md, textAlign: "center" },
  stepBody: { color: colors.warmMuted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  navBtn: { flex: 1, paddingVertical: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navy200, alignItems: "center" },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: colors.warmMuted, fontSize: 14, fontWeight: "500" },
  primaryBtn: { flex: 1, paddingVertical: 16, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: "center" },
  primaryBtnText: { color: colors.navy, fontSize: 14, fontWeight: "600" },
});
