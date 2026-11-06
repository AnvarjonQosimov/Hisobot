import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

function AttendanceCamera({ title, onCapture, onClose, isSaving = false }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user");
  const [cameraError, setCameraError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [detectorReady, setDetectorReady] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    let active = true;

    const loadFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm",
        );
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `${process.env.PUBLIC_URL}/models/blaze_face_short_range.tflite`,
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.6,
        });
        if (!active) {
          detector.close();
          return;
        }
        faceDetectorRef.current = detector;
        setDetectorReady(true);
      } catch (error) {
        console.error("Could not load face detector:", error);
        if (active) setCaptureError("attendance_face_detector_failed");
      }
    };

    loadFaceDetector();
    return () => {
      active = false;
      faceDetectorRef.current?.close();
      faceDetectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("camera-not-supported");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
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
  }, [facingMode]);

  const capture = async () => {
    const video = videoRef.current;
    const detector = faceDetectorRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("attendance_camera_not_ready");
      return;
    }
    if (!detector) {
      setCaptureError("attendance_face_detector_failed");
      return;
    }

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCaptureError("attendance_camera_image_failed");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const detections = detector.detect(canvas).detections;
      if (!detections.length) {
        setCaptureError("attendance_face_not_found");
        return;
      }
    } catch (error) {
      console.error("Could not detect a face in the attendance photo:", error);
      setCaptureError("attendance_face_detector_failed");
      return;
    }

    let quality = 0.72;
    let imageData = canvas.toDataURL("image/jpeg", quality);
    while (imageData.length > 700000 && quality > 0.3) {
      quality -= 0.1;
      imageData = canvas.toDataURL("image/jpeg", quality);
    }
    if (imageData.length > 700000) {
      setCaptureError("attendance_camera_resize");
      return;
    }

    setCaptureError("");
    setPreviewImage(imageData);
  };

  const confirmCapture = async () => {
    if (!previewImage) return;
    setCaptureError("");
    try {
      await onCapture(previewImage);
    } catch (error) {
      console.error("Could not save attendance photo:", error);
      setCaptureError(
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
        ) : previewImage ? (
          <>
            <img className="davomat-camera-preview" src={previewImage} alt={t("attendance_photo_preview_alt")} />
            <p className="davomat-camera-confirm-prompt">{t("attendance_photo_confirm")}</p>
          </>
        ) : (
          <>
            <video ref={videoRef} className="davomat-camera-video" autoPlay playsInline muted />
            {!detectorReady && (
              <p className="davomat-camera-status">{t("attendance_face_detector_loading")}</p>
            )}
          </>
        )}
        {captureError && <p role="alert" className="davomat-camera-error">{t(captureError)}</p>}
        <div className="davomat-modal-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            {t("bekorqilish")}
          </button>
          {previewImage ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPreviewImage("");
                  setCaptureError("");
                }}
                disabled={isSaving}
              >
                {t("attendance_retake_photo")}
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={confirmCapture}
                disabled={isSaving}
              >
                {isSaving ? t("attendance_saving") : t("attendance_use_photo")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  setCaptureError("");
                  setFacingMode((current) => current === "user" ? "environment" : "user");
                }}
                disabled={isSaving}
              >
                {t("attendance_switch_camera")}
              </button>
              <button
                type="button"
                className="davomat-save-button"
                onClick={capture}
                disabled={isSaving || Boolean(cameraError) || !detectorReady}
              >
                {t("attendance_take_photo")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceCamera;
