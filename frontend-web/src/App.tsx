import { Routes, Route, Link } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import CameraScanPage from "./pages/CameraScanPage";

const App = () => {
  return (
    <div>
      <nav className="p-4 bg-blue-600 text-white flex gap-4">
        <Link to="/">Flashcard</Link>
        <Link to="/scan">Scan</Link>
      </nav>
      <Routes>
        <Route path="/" element={<FlashcardPage />} />
        <Route path="/scan" element={<CameraScanPage />} />
      </Routes>
    </div>
  );
};

export default App;
