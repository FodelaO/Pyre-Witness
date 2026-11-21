/** Coordinates local phone enrollment and the rehearsal controls. */
"use client";

import { useEffect, useState } from "react";
import { useTwinStore } from "@/twin/store";
import { PHONE_CONTACT_KEY, readPhoneContact, writePhoneContact, type PhoneContact } from "./phoneContact";
import { maskPhoneNumber } from "./phoneNumber";
import { clearTestAlert, runTestAlert, TEST_ASSET_ID } from "./testScenario";
import type { EscalationRecord } from "./types";
import { useTelephoneCalls } from "./useTelephoneCalls";

export function useEscalationPhone(records: EscalationRecord[]) {
  const [contact, setContact] = useState(readPhoneContact);
  const [dialog, setDialog] = useState(false);
  const [testError, setTestError] = useState("");
  const testRunning = useTwinStore((state) => state.twin.assets.some(({ id }) => id === TEST_ASSET_ID));
  const telephone = useTelephoneCalls(contact, records);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === PHONE_CONTACT_KEY || event.key === null) setContact(readPhoneContact());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function toggleTest() {
    setTestError("");
    if (testRunning) {
      clearTestAlert();
      return true;
    }
    const started = runTestAlert();
    if (!started) setTestError("Filler 3 and PLC-F3 are required for the test.");
    return started;
  }

  function savePhone(next: PhoneContact | null) {
    if (!writePhoneContact(next)) return false;
    setContact(next);
    setDialog(false);
    return true;
  }

  return {
    contact, dialog, testRunning, testError, toggleTest, savePhone,
    mode: telephone.mode,
    maskedNumber: contact ? maskPhoneNumber(contact.number) : undefined,
    openPhone: () => setDialog(true),
    closePhone: () => setDialog(false),
    callNow: telephone.callNow,
    callFromDevice(id: string) {
      if (!contact) setDialog(true);
      else telephone.callFromDevice(id);
    },
  };
}
