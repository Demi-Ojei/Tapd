/**
 * Root index — immediately redirects to the guest home screen.
 * Without this file, Expo Router doesn't know where to start and
 * alphabetically picks (admin) over (guest).
 */
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(guest)/" />;
}
