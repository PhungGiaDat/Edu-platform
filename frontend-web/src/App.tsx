import { Routes, Route } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import LearnAR from "./pages/LearnAR";
import Navbar from "./components/Navbar";

const App = () => {
  return (
    // v23.0: Layout tích hợp - sử dụng flexbox để tạo navbar cố định và main area co giãn
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header - chiều cao cố định */}
      <Navbar />

      {/* Main Content - tự động co giãn để lấp đầy không gian còn lại */}
      <main className="flex-grow relative overflow-hidden">
        <Routes>
          <Route path="/" element={<FlashcardPage />} />
          <Route path="/learn-ar" element={<LearnAR />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
