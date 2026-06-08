import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

function HtmlLangSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    // Sincroniza el atributo lang del <html> con el idioma activo de i18n
    // para que screen readers + SEO + auto-translate del browser funcionen bien.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = i18n.language.split('-')[0] || 'es';
    }
  }, [i18n.language]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PomodoroProvider>
          <HtmlLangSync />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </BrowserRouter>
        </PomodoroProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
