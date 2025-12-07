import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithCustomToken } from 'firebase/auth';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { auth } from '$lib/firebase/firebase.app';

const upgradeSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type UpgradeFormValues = z.infer<typeof upgradeSchema>;

const GuestUpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<UpgradeFormValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check if guest ID exists in sessionStorage
    const guestId = sessionStorage.getItem('guestId');
    if (!guestId) {
      // Redirect to guest entry if no guest ID
      navigate('/guests/entry', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (values: UpgradeFormValues) => {
    setError('');
    setLoading(true);

    const guestId = sessionStorage.getItem('guestId');
    if (!guestId) {
      setError('Guest session expired. Please start over.');
      setLoading(false);
      navigate('/guests/entry', { replace: true });
      return;
    }

    try {
      // Call upgrade endpoint
      const upgradeResponse = await fetch('/api/guests/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          password: values.password,
        }),
      });

      const upgradeData = (await upgradeResponse.json()) as {
        success: boolean;
        message?: string;
        uid?: string;
        customToken?: string | null;
        error?: string;
      };

      if (!upgradeResponse.ok || !upgradeData.success) {
        setError(upgradeData.error || 'Failed to upgrade account');
        setLoading(false);
        return;
      }

      // If custom token is provided, use it to sign in immediately
      if (upgradeData.customToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, upgradeData.customToken);

          const idToken = await userCredential.user.getIdToken();

          // Create session
          const sessionResponse = await fetch('/api/auth/sessionLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ idToken }),
          });

          if (sessionResponse.ok) {
            // Clear guest session data
            sessionStorage.removeItem('guestId');
            sessionStorage.removeItem('guestEventId');
            sessionStorage.removeItem('guestEventName');
            sessionStorage.removeItem('guestEventCode');

            setSuccess(true);
            // Redirect to dashboard after a brief delay
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          } else {
            const sessionData = await sessionResponse.json();
            setError(
              sessionData.error ||
                'Account upgraded but failed to create session. Please log in with your email and password.'
            );
            setLoading(false);
          }
        } catch (authError: unknown) {
          console.error('Failed to sign in with custom token:', authError);
          setError('Account upgraded successfully. Please log in with your email and password.');
          setLoading(false);
          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/authentication', { replace: true });
          }, 3000);
        }
      } else {
        // No custom token - user needs to sign in manually
        setError('Account upgraded successfully. Please log in with your email and password.');
        setLoading(false);
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/authentication', { replace: true });
        }, 3000);
      }
    } catch (err: unknown) {
      console.error('Upgrade error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade account. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <Logo size="md" />
            </div>
            <h1 className="text-4xl font-bold text-base-content mb-2">Upgrade Complete!</h1>
          </div>

          <FormContainer>
            <div className="alert alert-success">
              <span>
                Your account has been upgraded successfully. You now have full member access with
                persistent sessions and profile management.
              </span>
            </div>
            <p className="text-center text-base-content opacity-70 mt-4">
              Redirecting to your dashboard...
            </p>
          </FormContainer>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <Logo size="md" />
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">Upgrade to Member</h1>
          <p className="text-sm opacity-70">
            Add a password to your account to enable persistent sessions, login, and profile
            management
          </p>
        </div>

        <FormContainer>
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-control">
              <label htmlFor="password" className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="input input-bordered"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {form.formState.errors.password.message}
                  </span>
                </div>
              )}
            </div>

            <div className="form-control">
              <label htmlFor="confirmPassword" className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="input input-bordered"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <div className="label">
                  <span className="label-text-alt text-error">
                    {form.formState.errors.confirmPassword.message}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Upgrading...' : 'Upgrade to Member'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button type="button" onClick={() => navigate(-1)} className="link link-primary">
              Cancel
            </button>
          </div>
        </FormContainer>
      </div>
    </PageContainer>
  );
};

export default GuestUpgradePage;
