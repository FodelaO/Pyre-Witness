/** Open an inline camera on demand and release all tracks when the preview leaves. */
import { useEffect, useRef, useState } from "react";
import { Aperture, Camera, SwitchCamera } from "lucide-react";

interface CameraRequest {
  deviceId?: string;
}

type CameraResult = { request: CameraRequest } & (
  | { kind: "live"; deviceId?: string; devices: MediaDeviceInfo[] }
  | { kind: "error"; message: string }
);

const stop = (stream?: MediaStream) => stream?.getTracks().forEach((track) => track.stop());

export default function CameraPreview({ autoStart, disabled, canShoot, onShot }: {
  autoStart: boolean;
  disabled: boolean;
  canShoot: boolean;
  onShot: (video: HTMLVideoElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [request, setRequest] = useState<CameraRequest | null>(() => autoStart ? {} : null);
  const [result, setResult] = useState<CameraResult | null>(null);
  const active = result && result.request === request ? result : null;
  const live = active?.kind === "live";

  useEffect(() => {
    if (!request) return;
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let stream: MediaStream | undefined;

    async function openCamera(preview: HTMLVideoElement, choice: CameraRequest) {
      try {
        const media = navigator.mediaDevices;
        if (!media?.getUserMedia) throw new Error("Camera unavailable. Upload a photo.");

        stream = await media.getUserMedia({
          audio: false,
          video: choice.deviceId
            ? { deviceId: { exact: choice.deviceId } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (disposed) {
          stop(stream);
          return;
        }

        const track = stream.getVideoTracks()[0];
        track?.addEventListener("ended", () => {
          if (!disposed) setResult({ request: choice, kind: "error", message: "Camera disconnected. Upload a photo." });
        }, { once: true });
        preview.srcObject = stream;
        await preview.play();
        if (disposed || track?.readyState !== "live") return;
        const opened: CameraResult = {
          request: choice, kind: "live", deviceId: track.getSettings().deviceId ?? choice.deviceId, devices: [],
        };
        setResult(opened);
        const devices = await media.enumerateDevices().catch(() => []);
        if (disposed || track.readyState !== "live") return;
        setResult({ ...opened, devices: devices.filter((device) => device.kind === "videoinput" && device.deviceId) });
      } catch (error) {
        if (disposed) return;
        stop(stream);
        const message = error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera denied. Upload a photo."
          : "Camera unavailable. Upload a photo.";
        setResult({ request: choice, kind: "error", message });
      }
    }

    void openCamera(video, request);
    return () => {
      disposed = true;
      stop(stream);
      video.srcObject = null;
    };
  }, [request]);

  function switchCamera() {
    if (!live || active.devices.length < 2) return;
    const index = active.devices.findIndex((device) => device.deviceId === active.deviceId);
    setRequest({ deviceId: active.devices[(index + 1) % active.devices.length].deviceId });
  }

  return (
    <div className="pw-capture-preview" data-live={live}>
      <video ref={videoRef} muted autoPlay playsInline aria-label="Live camera preview" aria-hidden={!live} />
      {live ? (
        <div className="pw-capture-camera-controls">
          <button type="button" className="pw-capture-shutter" title="Take photo" aria-label="Take photo"
            disabled={disabled || !canShoot} onClick={() => {
              const video = videoRef.current;
              if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onShot(video);
            }}>
            <Aperture size={19} aria-hidden="true" />
          </button>
          {active.devices.length > 1 && (
            <button type="button" className="pw-capture-switch-camera" title="Switch camera" aria-label="Switch camera"
              onClick={switchCamera} disabled={disabled}>
              <SwitchCamera size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="pw-capture-preview-prompt">
          {request && !active ? <span role="status">Opening camera…</span> : (
            <>
              <button type="button" className="pw-capture-start-camera" onClick={() => setRequest({})} disabled={disabled}>
                <Camera size={18} aria-hidden="true" /> {active ? "Retry camera" : "Start camera"}
              </button>
              {active?.kind === "error" && <span role="status">{active.message}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
