/** Coordinates local enrollment, the first-alert prompt, and the rehearsal controls. */
"use client";

import { useEffect, useState } from "react";
import { useTwinStore } from "@/twin/store";
import { claimPhonePrompt, PHONE_CONTACT_KEY, readPhoneContact, writePhoneContact, type PhoneContact } from "./phoneContact";
import { maskPhoneNumber } from "./phoneNumber";
import { clearTestAlert, runTestAlert, TEST_ASSET_ID } from "./testScenario";
import type { EscalationRecord } from "./types";
import { useTelephoneCalls } from "./useTelephoneCalls";

export function useEscalationPhone(records: EscalationRecord[]) {
  const [contact, setContact] = useState(readPhoneContact);
  const [dialog, setDialog] = useState<"contact" | "test" | null>(null);
  const [testError, setTestError] = useState("");
  const testRunning = useTwinStore((state) => state.twin.assets.some(({ id }) => id === TEST_ASSET_ID));
  const telephone = useTelephoneCalls(contact, records);
  const alertActive = records.some((record) => !record.resolvedAt && !record.dismissedAt);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === PHONE_CONTACT_KEY || event.key === null) setContact(readPhoneContact());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (alertActive && !contact && claimPhonePrompt()) setDialog((current) => current ?? "contact");
  }, [alertActive, contact]);

  function injectTest() {
    const started = runTestAlert();
    if (!started) setTestError("Filler 3 and PLC-F3 are required for the test.");
    return started;
  }

  function toggleTest() {
    setTestError("");
    if (testRunning) clearTestAlert();
    else if (!contact) setDialog("test");
    else return injectTest();
    return true;
  }

  function savePhone(next: PhoneContact | null) {
    if (!writePhoneContact(next)) return false;
    setContact(next);
    setDialog(null);
    if (next && dialog === "test") injectTest();
    return true;
  }

  return {
    contact, dialog, testRunning, testError, toggleTest, savePhone,
    mode: telephone.mode,
    maskedNumber: contact ? maskPhoneNumber(contact.number) : undefined,
    openPhone: () => setDialog("contact"),
    closePhone: () => setDialog(null),
    callNow: telephone.callNow,
    callFromDevice(id: string) {
      if (!contact) setDialog("contact");
      else telephone.callFromDevice(id);
    },
  };
}
