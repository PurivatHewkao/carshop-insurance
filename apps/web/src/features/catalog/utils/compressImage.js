// Shrinks a photo chosen from the computer to a JPEG data URL small enough for the
// catalog API (which accepts uploaded images under 700 KB).
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ'));
    image.src = source;
  });
}

export async function compressImageFile(file, { maxWidth = 1280, maxHeight = 1000 } = {}) {
  const image = await loadImage(await readFileAsDataUrl(file));
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์ไม่สามารถจัดการรูปภาพนี้ได้');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.76;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 280_000 && quality > 0.5) {
    quality -= 0.06;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}
