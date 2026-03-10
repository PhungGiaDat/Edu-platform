import { Routes, Route, Navigate } from "react-router-dom";
import FlashcardPage from "./pages/FlashcardPage";
import LearnARV2 from "./pages/LearnARV2";
import { CourseList } from "./pages/CourseList";
import { CourseDetail } from "./pages/CourseDetail";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { LandingPage } from "./pages/LandingPage";
import { ProgressDashboard } from "./pages/ProgressDashboard";
import { LearningPathSetup } from "./pages/LearningPathSetup";
import { Layout } from "./components/Layout";
import { AIChatBuddy } from "./components/AIChatBuddy";
import { SpeedInsights } from "@vercel/speed-insights/react";

const App = () => {
  return (
    <>
      <SpeedInsights />
      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route path="/flashcards" element={<Layout><FlashcardPage /></Layout>} />
        <Route path="/learn-ar" element={<LearnARV2 />} />
        <Route path="/courses" element={<Layout><CourseList /></Layout>} />
        <Route path="/courses/:id" element={<Layout><CourseDetail /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/progress" element={<Layout><ProgressDashboard /></Layout>} />
        <Route path="/learning-path" element={<Layout><LearningPathSetup /></Layout>} />

        <Route path="/scan" element={<Navigate to="/learn-ar" replace />} />
      </Routes>

      {/* Global AI Chat Buddy - Floating on all pages */}
      <AIChatBuddy />
    </>
  );
};

export default App;

