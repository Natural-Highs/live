import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireConsentForm?: boolean;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute component for React Router
 * Replicates the logic from hooks.server.ts
 *
 * Protection rules:
 * - Protected routes: ["/dashboard", "/", "/admin", "/consent"]
 * - If not authenticated and accessing protected route → redirect to /authentication
 * - If authenticated but no consent form and on protected route (except /consent) → redirect to /consent
 * - If authenticated with consent form and on /consent → redirect to /dashboard
 * - If authenticated with consent form and on /authentication → redirect to /dashboard
 * - If requireAdmin and not admin → redirect to /dashboard
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireConsentForm = false,
  requireAdmin = false,
}) => {
  const { user, loading, consentForm, admin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const protectedRoutes = ['/dashboard', '/', '/admin', '/consent'];

  if (!user) {
    return <Navigate to="/authentication" replace state={{ from: location }} />;
  }

  if (consentForm) {
    if (location.pathname === '/consent') {
      return <Navigate to="/dashboard" replace />;
    }

    if (location.pathname === '/authentication') {
      return <Navigate to="/dashboard" replace />;
    }

    if (requireAdmin && !admin) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  if (location.pathname === '/consent') {
    return <>{children}</>;
  }

  if (protectedRoutes.includes(location.pathname) || requireConsentForm) {
    return <Navigate to="/consent" replace />;
  }

  if (requireAdmin && !admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
