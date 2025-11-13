import { createUserWithEmailAndPassword } from 'firebase/auth';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '$lib/firebase/firebase.app';
import { PageContainer } from '@/components/ui/page-container';
import GrnButton from '@/components/ui/GrnButton';
import GreyButton from '@/components/ui/GreyButton';

const SignUpPage1: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerData.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Create Firebase Auth user (client-side)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Get ID token and create session
      const idToken = await userCredential.user.getIdToken();

      const sessionResponse = await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (sessionResponse.ok) {
        navigate('/signup/about-you', {
          state: { email: formData.email, username: formData.username },
        });
      } else {
        setError('Failed to create session');
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';

      if (errorMessage.includes('email-already-in-use')) {
        setError('This email is already registered');
      } else if (errorMessage.includes('weak-password')) {
        setError('Password is too weak');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  return (
    <PageContainer>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <div className="w-28 h-28 bg-base-200 rounded-lg flex items-center justify-center">
              <span className="text-4xl">🌿</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">Sign Up</h1>
          <div className="text-xs opacity-70 mb-4">Page indicators</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-base-200 rounded-lg p-6 space-y-4 relative">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label htmlFor="username" className="label">
              <span className="label-text">Username</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="input input-bordered"
              placeholder="Enter username"
            />
          </div>

          <div className="form-control">
            <label htmlFor="email" className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input input-bordered"
              placeholder="Enter email"
            />
          </div>

          <div className="form-control">
            <label htmlFor="password" className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input input-bordered"
              placeholder="Enter password"
            />
          </div>

          <div className="form-control">
            <label htmlFor="confirmPassword" className="label">
              <span className="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="input input-bordered"
              placeholder="Confirm password"
            />
          </div>

          <GrnButton
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </GrnButton>

          <div className="divider">Or</div>

          <GreyButton
            type="button"
            onClick={() => navigate('/authentication')}
          >
            Sign In
          </GreyButton>
        </form>
      </div>
    </PageContainer>
  );
};

export default SignUpPage1;
