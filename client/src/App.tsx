import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GameSelect from "./pages/GameSelect";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="h-full flex flex-col bg-surface-bg">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<GameSelect />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
