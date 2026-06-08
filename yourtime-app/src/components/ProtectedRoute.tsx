import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-yt-muted text-sm">
        Cargando…
      </div>
    );
  }

  if (!session) {
    // Guardamos la ruta original para volver tras login (no usado todavía).
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
