import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "../../constants/theme";

type ViewState = "form" | "submitting" | "pending";

export default function AdminLoginScreen() {
  const [view, setView] = useState<ViewState>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [role, setRole] = useState("");

  const canSubmit = name.trim() && email.trim() && hotelName.trim() && role.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setView("submitting");
    setTimeout(() => setView("pending"), 900);
  };

  if (view === "pending") {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={styles.pendingIcon}>
          <View style={styles.pendingIconInner} />
        </View>
        <Text style={styles.pendingTitle}>Request sent</Text>
        <Text style={styles.pendingBody}>
          We'll review your request and email you at {email} once approved.
        </Text>
        <Pressable onPress={() => router.replace("/(guest)/")} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back to guest app</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Request admin access</Text>
          <Text style={styles.subtitle}>
            Admin access lets you manage zones, staff, and master keys. Every request is reviewed before access is granted.
          </Text>
          <Field label="Your name" value={name} onChangeText={setName} placeholder="Jane Smith" />
          <Field label="Work email" value={email} onChangeText={setEmail} placeholder="jane@yourhotel.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Hotel name" value={hotelName} onChangeText={setHotelName} placeholder="The Grand Boutique Hotel" />
          <Field label="Your role" value={role} onChangeText={setRole} placeholder="General Manager" />
          <Pressable style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={!canSubmit || view === "submitting"}>
            {view === "submitting" ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.submitBtnText}>Request access</Text>}
          </Pressable>
          <Pressable onPress={() => router.replace("/(guest)/")} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back to guest app</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.fieldInput} placeholderTextColor={colors.warmFaint} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 80, paddingBottom: 80 },
  title: { color: colors.warm, fontSize: 24, fontWeight: "300", marginBottom: spacing.sm },
  subtitle: { color: colors.warmMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.xl },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { color: colors.warmMuted, fontSize: 12, marginBottom: spacing.xs },
  fieldInput: { backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy200, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.warm, fontSize: 15 },
  submitBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: spacing.md },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.navy, fontWeight: "600", fontSize: 15 },
  pendingIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  pendingIconInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  pendingTitle: { color: colors.warm, fontSize: 20, fontWeight: "400", marginBottom: spacing.sm },
  pendingBody: { color: colors.warmMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: spacing.xl },
  backBtn: { paddingVertical: 12, alignItems: "center", marginTop: spacing.md },
  backBtnText: { color: colors.gold, fontSize: 14, textDecorationLine: "underline" },
});
