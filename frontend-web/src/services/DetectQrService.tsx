const BASE_URL = import.meta.env.VITE_BACKEND_API;


export const detectQR = async (imageBlob: Blob) => {
  const formData = new FormData();
  formData.append("file", imageBlob, "frame.jpg");

  try {
    const res = await fetch(`${BASE_URL}/api/detect_qr`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Lỗi khi gọi API detect_qr");

    return await res.json();
  } catch (error) {
    console.error("❌ QR detection error:", error);
    throw error;
  }
};
