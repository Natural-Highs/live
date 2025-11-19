import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import type React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import GreenCard from '@/components/ui/GreenCard';
import GreyButton from '@/components/ui/GreyButton';
import GrnButton from '@/components/ui/GrnButton';
import { PageContainer } from '@/components/ui/page-container';
import TitleCard from '@/components/ui/TitleCard';
import { auth } from '$lib/firebase/firebase.app';
import { BrandLogo } from '@/components/ui';
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
      <div className="min-h-screen flex items-center justify-center bg-base-100">
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

  return (
    <PageContainer>
      <BrandLogo
        size="lg"
        direction="vertical"
        showTitle={true}
        titleClassName="font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]"
        titlePosition="above"
        gapClassName="gap-0"
        titleSpacing={-55}
      />
      <TitleCard>
        <h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
      </TitleCard>
      <GreenCard>
        {authError && (
          <div className="alert alert-error">
            <span>{authError}</span>
          </div>
        )}

        {isSignUp ? (
          <form onSubmit={signupForm.handleSubmit(onSignUp)} className="space-y-4">
            <div className="form-control">
              <label htmlFor="signup-username" className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                id="signup-username"
                type="text"
                placeholder="johndoe"
                className="input input-bordered"
                {...signupForm.register('username')}
              />
              {signupForm.formState.errors.username && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {signupForm.formState.errors.username.message}
                  </span>
                </div>
              )}
            </div>

            <div className="form-control">
              <label htmlFor="signup-email" className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="john@example.com"
                className="input input-bordered"
                {...signupForm.register('email')}
              />
              {signupForm.formState.errors.email && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {signupForm.formState.errors.email.message}
                  </span>
                </div>
              )}
            </div>

            <div className="form-control">
              <label htmlFor="signup-password" className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                id="signup-password"
                type="password"
                className="input input-bordered"
                {...signupForm.register('password')}
              />
              {signupForm.formState.errors.password && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {signupForm.formState.errors.password.message}
                  </span>
                </div>
              )}
            </div>

            <div className="form-control">
              <label htmlFor="signup-confirm-password" className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                className="input input-bordered"
                {...signupForm.register('confirmPassword')}
              />
              {signupForm.formState.errors.confirmPassword && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {signupForm.formState.errors.confirmPassword.message}
                  </span>
                </div>
              )}
            </div>

            <GrnButton type="submit">Sign Up</GrnButton>
          </form>
        ) : (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div className="form-control">
              <label htmlFor="login-email" className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="john@example.com"
                className="input input-bordered"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {loginForm.formState.errors.email.message}
                  </span>
                </div>
              )}
            </div>

            <div className="form-control">
              <label htmlFor="login-password" className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                id="login-password"
                type="password"
                className="input input-bordered"
                {...loginForm.register('password')}
              />
              {loginForm.formState.errors.password && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {loginForm.formState.errors.password.message}
                  </span>
                </div>
              )}
            </div>

            <GrnButton type="submit">Sign In</GrnButton>
          </form>
        )}
      </GreenCard>
      <div className="text-center">
        <p className='pb-2 px-[7.2rem] font-inria text-[1.25rem]'>Or</p>
        <GreyButton
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setAuthError('');
            loginForm.reset();
            signupForm.reset();
          }}
        >
          {isSignUp ? 'Login' : 'Sign Up'}
        </GreyButton>
      </div>
    </PageContainer>
  );
};

export default AuthenticationPage;
