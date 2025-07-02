import { QRCodeCanvas } from "qrcode.react";
// import html2canvas from "html2canvas";
// import { useEffect } from "react";

type FlashcardProps = {  
  word: string;  
  bgUrl: string;  
  imgUrl: string;  
  qrData: string;  
};



export default function Flashcard({ word, bgUrl, imgUrl, qrData }: FlashcardProps) {
  
// const handleCapture = async () => {
//   const flashcardElement = document.getElementById("flashcard");

//   if (!flashcardElement) {
//     console.warn("❌ Không tìm thấy element #flashcard");
//     return;
//   }

//   console.log("✅ Tìm thấy flashcard, bắt đầu capture...");

//   const canvas = await html2canvas(flashcardElement);
//   canvas.toBlob(async (blob) => {
//     if (!blob) {
//       console.warn("❌ Không tạo được blob từ canvas");
//       return;
//     }

//     console.log("✅ Đã tạo blob, chuẩn bị gửi về server...");

//     const formData = new FormData();
//     formData.append("image", blob, "flashcard.png");

//     try {
//       const res = await fetch("http://127.0.0.1:8000/detect", {
//         method: "POST",
//         body: formData,
//       });

//       console.log("📡 Đã gửi yêu cầu về server...");

//       const result = await res.json();
//       console.log("📥 Kết quả từ server:", result);

//       alert(`🔍 Kết quả: ${result.message}`);
//     } catch (err) {
//       console.error("🔥 Lỗi khi gọi API:", err);
//     }
//   });
// };


  // useEffect(() => {
  //     const timeout = setTimeout(() => {
  //       handleCapture();
  //     }, 500); // Delay 0.5 giây

  //     return () => clearTimeout(timeout);
  //   }, []);

  return (
    <div  id ="flashcard" className="w-80 h-96 rounded-2xl shadow-xl overflow-hidden relative border-4 border-green-400 ">
      {/* Background image */}
      <div 
        className="absolute inset-0" 
        style={{ 
          backgroundImage: `url(${bgUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Overlay for better content visibility */}
      <div className="absolute inset-0 bg-blue-200 bg-opacity-50"></div>
      
      {/* QR Code - Top Right */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg z-30">
        <QRCodeCanvas value={qrData} size={60} />
      </div>
      
      {/* Content Container */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center p-6">
        {/* Main Image - Center */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <div className="bg-yellow-100 p-4 rounded-xl shadow-lg max-w-xs max-h-64">
            <img 
              src={imgUrl} 
              alt={word} 
              className="max-h-48 max-w-full object-contain rounded-lg" 
            />
          </div>
        </div>
        
        {/* Word Section - Below Image */}
        <div className="bg-orange-200 bg-opacity-95 px-6 py-3 rounded-xl shadow-lg">
          <span className="text-2xl font-bold text-pink-500 tracking-wide">
            {word.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}