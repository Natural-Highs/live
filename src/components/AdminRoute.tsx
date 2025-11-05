import type React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Wrapper around ProtectedRoute that requires admin access
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  return (
    <ProtectedRoute requireAdmin={true} requireConsentForm={true}>
      {children}
    </ProtectedRoute>
  );
};

export default AdminRoute;
