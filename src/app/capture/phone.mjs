/** Enhance the phone form with local JPEG previews and a LAN-only send. */
import { prepareImage } from "./image-runtime.mjs";

const panel = document.querySelector(".pw-phone-panel");
if (panel?.dataset.code) wirePhoneCapture(panel);

function wirePhoneCapture(panel) {
  const code = panel.dataset.code;
  const maxPhotos = Number(panel.dataset.maxPhotos);
  const longEdge = Number(panel.dataset.longEdge);
  const quality = Number(panel.dataset.quality);
  const form = panel.querySelector("form");
  const title = panel.querySelector("h1");
  const camera = form.querySelector("#phone-camera");
  const library = form.querySelector("#phone-library");
  const take = form.querySelector("#take-photo");
  const choose = form.querySelector("#choose-photos");
  const thumbnails = form.querySelector("ul");
  const count = form.querySelector("#photo-count");
  const note = form.querySelector("textarea");
  const submit = form.querySelector("#send-photos");
  const status = form.querySelector("#send-error");
  const sent = panel.querySelector(".pw-phone-sent");
  const sendMore = sent.querySelector("button");
  const images = [];
  let preparing = false;
  let sending = false;

  function error(message = "") {
    status.textContent = message;
    status.hidden = !message;
  }

  function render() {
    const blocked = preparing || sending;
    const canAdd = !blocked && images.length < maxPhotos;
    take.disabled = camera.disabled = choose.disabled = library.disabled = !canAdd;
    submit.disabled = blocked || !images.length;
    submit.querySelector("span").textContent = sending ? "Sending…" : "Send to laptop";
    note.disabled = sending;
    count.textContent = preparing ? "Preparing…" : `${images.length} / ${maxPhotos}`;

    const slots = Array.from({ length: maxPhotos }, (_, index) => {
      const slot = document.createElement("li");
      const photo = images[index];
      if (!photo) {
        slot.classList.add("pw-phone-empty-thumb");
        slot.setAttribute("aria-hidden", "true");
        return slot;
      }

      const preview = new Image();
      preview.alt = `Photo ${index + 1}`;
      preview.src = `data:${photo.mimeType};base64,${photo.dataBase64}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove photo ${index + 1}`);
      remove.textContent = "×";
      remove.disabled = blocked;
      remove.addEventListener("click", () => {
        images.splice(index, 1);
        error();
        render();
        const next = thumbnails.querySelectorAll("button");
        (next[Math.min(index, next.length - 1)] ?? choose).focus();
      });
      slot.append(preview, remove);
      return slot;
    });
    thumbnails.replaceChildren(...slots);
  }

  async function addPhotos(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (preparing || sending || !files.length) return;

    const room = maxPhotos - images.length;
    preparing = true;
    error();
    render();
    let skipped = false;
    for (const file of files.slice(0, room)) {
      try {
        images.push(await prepareImage(file, longEdge, quality));
      } catch {
        skipped = true;
      }
    }
    preparing = false;
    if (skipped) error("Could not read a photo. Try a JPEG or PNG.");
    else if (files.length > room) error("Up to three photos fit in a capture.");
    render();
  }

  take.addEventListener("click", () => camera.click());
  choose.addEventListener("click", () => library.click());
  camera.addEventListener("change", addPhotos);
  library.addEventListener("change", addPhotos);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!images.length || preparing || sending) return;
    sending = true;
    error();
    render();

    try {
      const response = await fetch(`/api/handoff/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, note: note.value.trim() || undefined }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not send photos. Try again.");
      }
      images.length = 0;
      note.value = "";
      form.hidden = true;
      title.textContent = "Photos sent";
      sent.hidden = false;
      sendMore.focus();
    } catch (cause) {
      error(cause instanceof Error && cause.name !== "TypeError" ? cause.message
        : "Could not reach the laptop. Check Wi-Fi and try again.");
    } finally {
      sending = false;
      render();
    }
  });

  sendMore.addEventListener("click", () => {
    sent.hidden = true;
    title.textContent = "Send photos";
    form.hidden = false;
    take.focus();
  });
  render();
}
