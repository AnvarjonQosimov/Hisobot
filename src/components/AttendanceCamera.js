import { useEffect, useRef, useState } from "react";

function AttendanceCamera({ title, onCapture, onClose, isSaving = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Bu qurilmada kamera mavjud emas.");
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
              ? "Kameradan foydalanishga ruxsat bering."
              : error.message || "Kamerani ishga tushirib bo'lmadi.",
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
      setCameraError("Kamera tasviri hali tayyor emas.");
      return;
    }

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Kamera tasvirini tayyorlab bo'lmadi.");
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
      setCameraError("Rasm hajmini kichraytirib qayta oling.");
      return;
    }

    try {
      await onCapture(imageData);
    } catch (error) {
      console.error("Could not save attendance photo:", error);
      setCameraError(
        error.code === "permission-denied"
          ? "Firestore ruxsat bermadi. Firebase loyihasiga yangilangan firestore.rules qoidalarini joylang."
          : error.message || "Rasmni saqlab bo'lmadi.",
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
          <p role="alert" className="davomat-camera-error">{cameraError}</p>
        ) : (
          <video ref={videoRef} className="davomat-camera-video" autoPlay playsInline muted />
        )}
        <div className="davomat-modal-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            Bekor qilish
          </button>
          <button
            type="button"
            className="davomat-save-button"
            onClick={capture}
            disabled={isSaving || Boolean(cameraError)}
          >
            {isSaving ? "Saqlanmoqda..." : "Rasmga olish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceCamera;
