import { Routes, Route, Navigate } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import LearnAR from "./pages/LearnAR";
import { CourseList } from "./pages/CourseList";
import { CourseDetail } from "./pages/CourseDetail";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Layout } from "./components/Layout";

const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes (Wrapped in Layout) */}
      <Route path="/" element={<Layout><FlashcardPage /></Layout>} />
      <Route path="/learn-ar" element={<Layout><LearnAR /></Layout>} />
      <Route path="/courses" element={<Layout><CourseList /></Layout>} />
      <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />

      <Route path="/scan" element={<Navigate to="/learn-ar" replace />} />
    </Routes>
  );
};

export default App;
