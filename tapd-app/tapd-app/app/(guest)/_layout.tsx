import { Stack } from "expo-router";

export default function GuestLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="how-it-works" options={{ presentation: "modal" }} />
    </Stack>
  );
}
