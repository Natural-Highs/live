import '@testing-library/jest-dom'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
	getAuth: vi.fn(() => ({
		currentUser: null,
		onAuthStateChanged: vi.fn(),
		signInWithEmailAndPassword: vi.fn(),
		createUserWithEmailAndPassword: vi.fn(),
		signOut: vi.fn()
	})),
	connectAuthEmulator: vi.fn(),
	onAuthStateChanged: vi.fn(),
	signInWithEmailAndPassword: vi.fn(),
	createUserWithEmailAndPassword: vi.fn(),
	signInWithCustomToken: vi.fn(),
	signOut: vi.fn()
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
	getFirestore: vi.fn(() => ({})),
	connectFirestoreEmulator: vi.fn(),
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	setDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn()
}))

// Mock Firebase App
vi.mock('firebase/app', () => ({
	initializeApp: vi.fn(() => ({})),
	getApps: vi.fn(() => []),
	getApp: vi.fn(() => ({}))
}))

// Mock Firebase app instance
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: null,
		onAuthStateChanged: vi.fn()
	},
	db: {}
}))

// Mock TanStack Router navigation hooks
vi.mock('@tanstack/react-router', async () => {
	const actual = await vi.importActual('@tanstack/react-router')
	return {
		...actual,
		useNavigate: vi.fn(() => vi.fn()),
		useRouter: vi.fn(() => ({
			navigate: vi.fn(),
			history: {push: vi.fn(), replace: vi.fn()}
		})),
		useParams: vi.fn(() => ({})),
		useSearch: vi.fn(() => ({})),
		useLocation: vi.fn(() => ({
			pathname: '/',
			search: '',
			hash: '',
			state: {}
		}))
	}
})

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
})

// Reset mocks before each test
beforeEach(() => {
	vi.clearAllMocks()
})
