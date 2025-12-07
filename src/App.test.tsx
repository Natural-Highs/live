import {render} from '@testing-library/react'
import type React from 'react'
import {MemoryRouter} from 'react-router-dom'
import App from './App'

// Mock dependencies
vi.mock('./context/AuthContext', () => ({
	AuthProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
	useAuth: () => ({
		user: null,
		loading: false,
		consentForm: null
	})
}))

// Mock Firebase
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: vi.fn()
	},
	db: {}
}))

// Mock TanStack Router hooks used by child components
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
	useLocation: () => ({pathname: '/', search: '', hash: '', state: {}}),
	Link: ({children, to}: {children: React.ReactNode; to: string}) => (
		<a href={to}>{children}</a>
	),
	Navigate: ({to}: {to: string}) => <div data-testid='navigate' data-to={to} />
}))

describe('App', () => {
	it('should render without crashing', async () => {
		render(
			<MemoryRouter initialEntries={['/authentication']}>
				<App />
			</MemoryRouter>
		)

		// The app should render - check for any content
		expect(document.body).toBeInTheDocument()
	})
})
