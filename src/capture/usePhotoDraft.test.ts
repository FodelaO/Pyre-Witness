/** Exercises the photo draft used by the preview and by Retry after a sample submission. */
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { CaptureImage } from "@/pipeline/types";
import { usePhotoDraft } from "./usePhotoDraft";

it.each([true, false])("restores the submitted sample for Retry (staged photo: %s)", (staged) => {
  const mug: CaptureImage = { mimeType: "image/jpeg", dataBase64: "bXVn" };
  const plc: CaptureImage = { mimeType: "image/jpeg", dataBase64: "cGxj" };
  let submitted: CaptureImage[] = [];
  let restored: CaptureImage[] = [];

  function Trial() {
    const draft = usePhotoDraft();
    const [step, setStep] = useState(0);
    if (step === 0) {
      if (staged) draft.addPrepared([mug]);
      setStep(1);
    } else if (step === 1) {
      submitted = draft.selectSample(plc).images;
      setStep(2);
    } else {
      restored = draft.photos.map(({ image }) => image);
    }
    return null;
  }
  renderToStaticMarkup(createElement(Trial));
  expect(submitted).toEqual([plc]);
  expect(restored).toEqual(submitted);
});
