import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Analytics } from '@vercel/analytics/react';
import { injectSpeedInsights } from '@vercel/speed-insights';

// Vercel Speed Insights — modo imperativo (la variante /react tiene bugs con React 19)
injectSpeedInsights();
import { AuthProvider } from './context/AuthContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
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
              <Route path="/" element={<Landing />} />
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
              {/* Cualquier ruta desconocida vuelve a la landing (no a /app
                  para no bloquear usuarios sin sesión en un loop a /login). */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </PomodoroProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
