import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthenticationPage from './pages/AuthenticationPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/authentication" element={<AuthenticationPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
