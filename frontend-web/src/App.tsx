import { Routes, Route } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import CameraScanPage from "./pages/CameraScanPage";
import ARView from "./components/ARView";
import Navbar from "./components/Navbar";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content */}
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<FlashcardPage />} />
          <Route path="/scan" element={<CameraScanPage />} />
          <Route path="/ar" element={<ARView />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
