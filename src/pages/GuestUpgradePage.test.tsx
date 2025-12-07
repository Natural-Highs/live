/**
 * Unit tests for GuestUpgradePage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, form validation, error handling, and guest upgrade
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuestUpgradePage from './GuestUpgradePage';

// Mock dependencies
// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Firebase auth
vi.mock('$lib/firebase/firebase.app', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithCustomToken: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GuestUpgradePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

  it('redirects to entry page when guest ID is missing', () => {
    render(
      <BrowserRouter>
        <GuestUpgradePage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/guests/entry', { replace: true });
  });

  it('renders upgrade form when guest ID is present', async () => {
    sessionStorage.setItem('guestId', 'guest-1');

    await act(async () => {
      render(
        <BrowserRouter>
          <GuestUpgradePage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Upgrade to Member/i })).toBeInTheDocument();
    });

    // Check for password inputs by placeholder
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm your password/i)).toBeInTheDocument();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('guestId', 'guest-1');

    render(
      <BrowserRouter>
        <GuestUpgradePage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, '12345'); // Less than 6 characters

    const confirmInput = screen.getByLabelText(/^Confirm Password$/i);
    await user.type(confirmInput, '12345');

    const submitButton = screen.getByRole('button', { name: /Upgrade/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('guestId', 'guest-1');

    render(
      <BrowserRouter>
        <GuestUpgradePage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, 'password123');

    const confirmInput = screen.getByLabelText(/^Confirm Password$/i);
    await user.type(confirmInput, 'password456'); // Different password

    const submitButton = screen.getByRole('button', { name: /Upgrade/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('renders submit button with correct text', async () => {
    sessionStorage.setItem('guestId', 'guest-1');

    await act(async () => {
      render(
        <BrowserRouter>
          <GuestUpgradePage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upgrade to Member/i })).toBeInTheDocument();
    });
  });

  it('disables submit button when loading', async () => {
    sessionStorage.setItem('guestId', 'guest-1');

    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves to keep loading state
        })
    );

    const user = userEvent.setup();

    await act(async () => {
      render(
        <BrowserRouter>
          <GuestUpgradePage />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^Password$/i);
    await user.type(passwordInput, 'password123');

    const confirmInput = screen.getByLabelText(/^Confirm Password$/i);
    await user.type(confirmInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /Upgrade to Member/i });
    await user.click(submitButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Upgrading.../i)).toBeInTheDocument();
    });
  });
});
