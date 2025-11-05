import type React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { user, consentForm } = useAuth();

  return (
    <PageContainer>
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        <h1 className="text-5xl font-bold text-base-content mb-4">Natural Highs</h1>
        <p className="text-lg text-base-content opacity-80 mb-8">
          TODO: Add app description and welcome message
        </p>

        {user && (
          <div className="space-y-4">
            {!consentForm ? (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-base-content">Consent Required</h2>
                  <p className="text-base-content opacity-70">
                    Please complete the consent form to continue
                  </p>
                  <div className="card-actions justify-center mt-4">
                    <Link to="/consent" className="btn btn-primary">
                      Go to Consent Form
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-base-content">Welcome Back</h2>
                  <p className="text-base-content opacity-70">
                    Access your dashboard to join events and complete surveys
                  </p>
                  <div className="card-actions justify-center mt-4">
                    <Link to="/dashboard" className="btn btn-primary">
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="space-y-4">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-base-content">TODO: Add home page title</h2>
                <p className="text-base-content opacity-70">TODO: Add home page text</p>
                <div className="card-actions justify-center gap-4 mt-4">
                  <Link to="/signup" className="btn btn-primary">
                    Sign Up
                  </Link>
                  <Link to="/authentication" className="btn btn-secondary">
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default HomePage;
