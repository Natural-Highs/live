import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import type React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { BrandLogo } from '@/components/ui';
import { auth } from '$lib/firebase/firebase.app';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z
  .object({
    username: z.string().min(2, 'Username must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const AuthenticationPage: React.FC = () => {
  const { user, loading, consentForm } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (!loading && user && consentForm) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-100 to-green-50">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const onLogin = async (values: LoginFormValues) => {
    setAuthError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);

      const idToken = await userCredential.user.getIdToken();

      const sessionResponse = await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (sessionResponse.ok) {
        window.location.reload();
      } else {
        const data = await sessionResponse.json();
        setAuthError(data.error || 'Failed to create session');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('auth/invalid-credential')) {
          setAuthError('Invalid email or password');
        } else if (error.message.includes('auth/user-not-found')) {
          setAuthError('User not found');
        } else {
          setAuthError(error.message);
        }
      } else {
        setAuthError('Login failed');
      }
    }
  };

  const onSignUp = async (values: SignupFormValues) => {
    setAuthError('');
    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setAuthError(registerData.error || 'Registration failed');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const idToken = await userCredential.user.getIdToken();

      const sessionResponse = await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (sessionResponse.ok) {
        window.location.href = '/signup2';
      } else {
        const data = await sessionResponse.json();
        setAuthError(data.error || 'Failed to create session');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('auth/email-already-in-use')) {
          setAuthError('Email already in use');
        } else {
          setAuthError(error.message);
        }
      } else {
        setAuthError('Registration failed');
      }
    }
  };

  const handleGuestSignIn = () => {
    // TODO: Implement guest sign in logic
    console.log('Sign in as guest');
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password logic
    console.log('Forgot password');
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="mb-8">
          <BrandLogo
            size="lg"
            direction="vertical"
            showTitle={true}
            titleClassName="font-['Kapakana'] text-[75px] leading-none tracking-normal [word-spacing:0.40em]"
            titlePosition="above"
            gapClassName="gap-0"
            titleSpacing={-55}
          />
        </div>

        {/* Progress Dots - Only show on Sign Up */}
        {isSignUp && (
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-green-700"></div>
            <div className="w-3 h-3 rounded-full bg-white border-2 border-green-700"></div>
            <div className="w-3 h-3 rounded-full bg-white border-2 border-green-700"></div>
            <div className="w-3 h-3 rounded-full bg-white border-2 border-green-700"></div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-base-200 rounded-3xl p-6 mb-6 shadow-md">
          <h2 className="text-3xl font-serif text-gray-800 text-center border-b-2 border-gray-800 pb-2 mb-6 inline-block w-full">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>

          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm text-center">
              {authError}
            </div>
          )}

          {isSignUp ? (
            <form onSubmit={signupForm.handleSubmit(onSignUp)} className="space-y-4">
              <div>
                <label htmlFor="signup-username" className="block text-gray-800 font-semibold mb-2">
                  Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  placeholder="johndoe"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...signupForm.register('username')}
                />
                {signupForm.formState.errors.username && (
                  <p className="text-red-700 text-sm mt-1">
                    {signupForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-gray-800 font-semibold mb-2">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="john@example.com"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...signupForm.register('email')}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-red-700 text-sm mt-1">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-gray-800 font-semibold mb-2">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...signupForm.register('password')}
                />
                {signupForm.formState.errors.password && (
                  <p className="text-red-700 text-sm mt-1">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-gray-800 font-semibold mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...signupForm.register('confirmPassword')}
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-red-700 text-sm mt-1">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={signupForm.formState.isSubmitting}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-colors duration-200"
              >
                {signupForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-gray-800 font-semibold mb-2">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="john@example.com"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-700 text-sm mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-gray-800 font-semibold mb-2">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="w-full bg-white rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-red-700 text-sm mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-colors duration-200"
              >
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-green-800 italic text-sm hover:underline"
              >
                Forgot password?
              </button>
            </form>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-0.5 bg-gray-800"></div>
          <span className="text-gray-800 font-serif">Or</span>
          <div className="flex-1 h-0.5 bg-gray-800"></div>
        </div>

        {/* Bottom Buttons */}
        <div className="space-y-3">
          {isSignUp ? (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setAuthError('');
                loginForm.reset();
                signupForm.reset();
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-full transition-colors duration-200"
            >
              Sign In
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError('');
                  loginForm.reset();
                  signupForm.reset();
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-full transition-colors duration-200"
              >
                Create an Account
              </button>

              <button
                type="button"
                onClick={handleGuestSignIn}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-full transition-colors duration-200"
              >
                Sign in as a Guest
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>naturalhighs.org</p>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationPage;
