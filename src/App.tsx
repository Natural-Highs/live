import { Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminPage from './pages/AdminPage';
import AuthenticationPage from './pages/AuthenticationPage';
import GuestPage from './pages/GuestPage';
import ConsentFormPage from './pages/ConsentFormPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import SignUpPage1 from './pages/SignUpPage1';
import SignUpPage2 from './pages/SignUpPage2';
import AccountInfoPage from './pages/AccountInformation';
import AnalyticsPage from './pages/AnalyticsPage';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Protected routes - require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountInfoPage />
              </ProtectedRoute>
            }
          />
          {/* Admin routes - require admin access */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AnalyticsPage />
              </AdminRoute>
            }
          />
          {/* Consent form route - protected but doesn't require consent form to be completed */}
          <Route
            path="/consent"
            element={
              <ProtectedRoute>
                <ConsentFormPage />
              </ProtectedRoute>
            }
          />
          {/* Public routes */}
          <Route path="/authentication" element={<AuthenticationPage />} />
          <Route path="/guest" element={<GuestPage />} />
          <Route path="/signup" element={<SignUpPage1 />} />
          <Route
            path="/signup/about-you"
            element={
              <ProtectedRoute>
                <SignUpPage2 />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
