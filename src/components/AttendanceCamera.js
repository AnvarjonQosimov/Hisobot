import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function AttendanceCamera({ title, onCapture, onClose, isSaving = false }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("camera-not-supported");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Could not start attendance camera:", error);
        if (active) {
          setCameraError(
            error.name === "NotAllowedError"
              ? "attendance_camera_permission"
              : error.message === "camera-not-supported"
                ? "attendance_camera_not_supported"
                : "attendance_camera_start_failed",
          );
        }
      }
    };

    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("attendance_camera_not_ready");
      return;
    }

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("attendance_camera_image_failed");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    let quality = 0.72;
    let imageData = canvas.toDataURL("image/jpeg", quality);
    while (imageData.length > 700000 && quality > 0.3) {
      quality -= 0.1;
      imageData = canvas.toDataURL("image/jpeg", quality);
    }
    if (imageData.length > 700000) {
      setCameraError("attendance_camera_resize");
      return;
    }

    try {
      await onCapture(imageData);
    } catch (error) {
      console.error("Could not save attendance photo:", error);
      setCameraError(
        error.code === "permission-denied"
          ? "attendance_camera_rules_error"
          : "attendance_camera_save_failed",
      );
    }
  };

  return (
    <div className="davomat-modal-overlay" onMouseDown={onClose}>
      <div
        className="davomat-modal davomat-camera-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        {cameraError ? (
          <p role="alert" className="davomat-camera-error">{t(cameraError)}</p>
        ) : (
          <video ref={videoRef} className="davomat-camera-video" autoPlay playsInline muted />
        )}
        <div className="davomat-modal-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            {t("bekorqilish")}
          </button>
          <button
            type="button"
            className="davomat-save-button"
            onClick={capture}
            disabled={isSaving || Boolean(cameraError)}
          >
            {isSaving ? t("attendance_saving") : t("attendance_take_photo")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceCamera;
