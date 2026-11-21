// Source takes, final cut order, and card copy for the PLC walkthrough.
export const TAKE_REVISION = "plc-photo-light-3d";
export const CAPTURE_GROUP = ["capture", "move"];
export const STORYBOARD = [...CAPTURE_GROUP, "watch", "alerts"];
export const RECORD_ORDER = STORYBOARD;

export const TITLE = { seconds: 4, tagline: "We watch two things at once: new equipment and new information." };
export const END = {
  seconds: 4,
  jobs: [["Decisions", "Check the input"], ["Hydrogen", "Read the photo"], ["Carbon", "Find a safer spot"], ["Neon", "Brief the operator"], ["Inspector", "Check plant rules"]],
  note: "Inspector uses the rules engine.",
  url: "github.com/FodelaO/Pyre-Witness",
};
