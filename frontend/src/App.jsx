import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { TourProvider } from "./context/TourContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Documents from "./pages/Documents.jsx";
import Generate from "./pages/Generate.jsx";
import Results from "./pages/Results.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <AppProvider>
      <TourProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/results" element={<Results />} />
            <Route
              path="/admin"
              element={user.role === "admin" ? <Admin /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </TourProvider>
    </AppProvider>
  );
}
