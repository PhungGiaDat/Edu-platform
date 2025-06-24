import { QRCodeCanvas } from "qrcode.react";

type FlashcardProps = {  
  word: string;  
  bgUrl: string;  
  imgUrl: string;  
  qrData: string;  
};

export default function Flashcard({ word, bgUrl, imgUrl, qrData }: FlashcardProps) {
  return (
    <div className="w-80 h-96 rounded-2xl shadow-xl overflow-hidden relative border-4 border-yellow-400">
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
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* QR Code - Top Right */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg z-30">
        <QRCodeCanvas value={qrData} size={60} />
      </div>
      
      {/* Content Container */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center p-6">
        {/* Main Image - Center */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <div className="bg-white p-4 rounded-xl shadow-lg max-w-xs max-h-64">
            <img 
              src={imgUrl} 
              alt={word} 
              className="max-h-48 max-w-full object-contain rounded-lg" 
            />
          </div>
        </div>
        
        {/* Word Section - Below Image */}
        <div className="bg-yellow-200 bg-opacity-95 px-6 py-3 rounded-xl shadow-lg">
          <span className="text-2xl font-bold text-pink-600 tracking-wide">
            {word.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}