/**
 * TAPD — Unlock Hook
 * Simulates NFC unlock for Expo Go preview.
 * Real NFC added in production build.
 */

import { useCallback, useState } from "react";
import type { StoredRoomKey } from "./secureKeyStore";

export type UnlockStatus = "idle" | "checking" | "tap" | "granted" | "denied" | "error";

interface UnlockResult {
  status: UnlockStatus;
  message: string;
}

export function useUnlockDoor() {
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const [message, setMessage] = useState("");

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
  }, []);

  const unlock = useCallback(async (key: StoredRoomKey): Promise<UnlockResult> => {
    // Step 1: checking
    setStatus("checking");
    setMessage("Checking your key…");
    await new Promise(r => setTimeout(r, 1000));

    // Step 2: tap prompt
    setStatus("tap");
    setMessage("Hold your phone near the door");
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: granted
    setStatus("granted");
    setMessage("Door unlocked");
    return { status: "granted", message: "Door unlocked" };
  }, []);

  return { status, message, unlock, reset };
}
