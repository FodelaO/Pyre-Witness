/** Checks speech repetition and XML escaping against text with tag-like characters. */
import { expect, it } from "vitest";
import { buildTwiml } from "./twiml";

it("speaks identical escaped text with a one-second pause", () => {
  const script = "This is a Pyre Witness test. Filler <3> & 'Line' \"A\"\u0000.";
  const encoded = "This is a Pyre Witness test. Filler &lt;3&gt; &amp; &apos;Line&apos; &quot;A&quot;.";
  expect(buildTwiml(script)).toBe("<Response><Say>" + encoded + '</Say><Pause length="1"/><Say>' + encoded + "</Say></Response>");
});
