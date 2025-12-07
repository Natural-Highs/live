import {Route, Routes} from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import {AuthProvider} from './context/AuthContext'
import AdminPage from './pages/AdminPage'
import AuthenticationPage from './pages/AuthenticationPage'
import ConsentFormPage from './pages/ConsentFormPage'
import DashboardPage from './pages/DashboardPage'
import GuestPage from './pages/GuestPage'
import HomePage from './pages/HomePage'
import SignUpPage1 from './pages/SignUpPage1'
import SignUpPage2 from './pages/SignUpPage2'

function App() {
	return (
		<AuthProvider>
			<Layout>
				<Routes>
					{/* Protected routes - require authentication */}
					<Route
						element={
							<ProtectedRoute>
								<HomePage />
							</ProtectedRoute>
						}
						path='/'
					/>
					<Route
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
						path='/dashboard'
					/>
					{/* Admin routes - require admin access */}
					<Route
						element={
							<AdminRoute>
								<AdminPage />
							</AdminRoute>
						}
						path='/admin/*'
					/>
					{/* Consent form route - protected but doesn't require consent form to be completed */}
					<Route
						element={
							<ProtectedRoute>
								<ConsentFormPage />
							</ProtectedRoute>
						}
						path='/consent'
					/>
					{/* Public routes */}
					<Route element={<AuthenticationPage />} path='/authentication' />
					<Route element={<GuestPage />} path='/guest' />
					<Route element={<SignUpPage1 />} path='/signup' />
					<Route
						element={
							<ProtectedRoute>
								<SignUpPage2 />
							</ProtectedRoute>
						}
						path='/signup/about-you'
					/>
				</Routes>
			</Layout>
		</AuthProvider>
	)
}

export default App
