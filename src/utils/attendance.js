export const getAttendanceDay = (date = new Date()) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

export const getAttendanceRecordId = (workerEmail, date = new Date()) => {
  const day = date;
  return `${workerEmail}__${day.getUTCFullYear()}_${day.getUTCMonth() + 1}_${day.getUTCDate()}`;
};

export const getAttendanceDateParts = (date = new Date()) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

export const getAttendanceFaceId = (bossEmail, workerId, pose) =>
  encodeURIComponent(`${bossEmail}:${String(workerId)}:${pose}`);

export const getImageDataUrl = (file, maxSize = 700000) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDimension = 640;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the selected photo."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.72;
      let imageData = canvas.toDataURL("image/jpeg", quality);
      while (imageData.length > maxSize && quality > 0.3) {
        quality -= 0.1;
        imageData = canvas.toDataURL("image/jpeg", quality);
      }
      if (imageData.length > maxSize) {
        reject(new Error("The photo is too large after compression."));
        return;
      }
      resolve(imageData);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected photo."));
    };
    image.src = objectUrl;
  });
