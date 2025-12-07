/**
 * Unit tests for HomePage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, conditional content based on auth state, and navigation links
 */
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from './HomePage';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders homepage title and description', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      consentForm: null,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Natural Highs')).toBeInTheDocument();
    expect(screen.getByText('Join events, complete surveys.')).toBeInTheDocument();
  });

  it('renders sign up and log in buttons when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      consentForm: null,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
  });

  it('renders consent form prompt when user is authenticated but has no consent form', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com', userId: 'test-user-id' },
      consentForm: null,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Consent Required')).toBeInTheDocument();
    expect(screen.getByText(/Please complete the consent form to continue/)).toBeInTheDocument();
    expect(screen.getByText('Go to Consent Form')).toBeInTheDocument();
  });

  it('renders welcome message and dashboard link when user is authenticated with consent form', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com', userId: 'test-user-id' },
      consentForm: { id: 'consent-1' },
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(
      screen.getByText(/Access your dashboard to join events and complete surveys/)
    ).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('renders get started card for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      consentForm: null,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(
      screen.getByText(/Create an account to join events and participate in surveys./)
    ).toBeInTheDocument();
  });
});
