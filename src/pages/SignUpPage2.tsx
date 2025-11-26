import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '@/components/ui/page-container';
import GrnButton from '@/components/ui/GrnButton';
import GreyButton from '@/components/ui/GreyButton';
import { BrandLogo } from '@/components/ui';
import TitleCard from '@/components/ui/TitleCard';
import GreenCard from '@/components/ui/GreenCard';

/**
 * SignUpPage2 - About You (Profile Information)
 * Collects: name, contact details, emergency contact, date of birth
 */
const SignUpPage2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get data from navigation state (from SignUpPage1)
  const { email } = location.state || {};

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if no auth or missing state
  useEffect(() => {
    if (!user && !email) {
      navigate('/signup', { replace: true });
    }
  }, [user, email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('First name, last name, and date of birth are required');
      setLoading(false);
      return;
    }

    // Validate date of birth (must be in the past)
    const dob = new Date(formData.dateOfBirth);
    const today = new Date();
    if (dob >= today) {
      setError('Date of birth must be in the past');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          dateOfBirth: formData.dateOfBirth,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined,
          emergencyContactRelationship: formData.emergencyContactRelationship || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        setLoading(false);
        return;
      }

      // Navigate to consent form or demographics next
      // TODO: Determine next step based on user flow requirements
      navigate('/consent', { replace: true });
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError('');
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
        <h1>About You</h1>
      </TitleCard>

      <GreenCard>

        <form onSubmit={handleSubmit} className="bg-base-200 rounded-lg p-6 space-y-4">
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label htmlFor="firstName" className="label">
              <span className="label-text">First Name *</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="input input-bordered w-full"
              placeholder="Enter first name"
            />
          </div>

          <div className="form-control">
            <label htmlFor="lastName" className="label">
              <span className="label-text">Last Name *</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="input input-bordered w-full"
              placeholder="Enter last name"
            />
          </div>

          <div className="form-control">
            <label htmlFor="phone" className="label">
              <span className="label-text">Phone Number</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-control">
            <label htmlFor="dateOfBirth" className="label">
              <span className="label-text">Date of Birth *</span>
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
              max={new Date().toISOString().split('T')[0]}
              className="input input-bordered w-full"
            />
          </div>

          <div className="divider">Emergency Contact</div>

          <div className="form-control">
            <label htmlFor="emergencyContactName" className="label">
              <span className="label-text">Emergency Contact Name</span>
            </label>
            <input
              type="text"
              id="emergencyContactName"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="Enter emergency contact name"
            />
          </div>

          <div className="form-control">
            <label htmlFor="emergencyContactPhone" className="label">
              <span className="label-text">Emergency Contact Phone</span>
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              className="input input-bordered w-full"
              placeholder="Enter emergency contact phone"
            />
          </div>

          <div className="form-control">
            <label htmlFor="emergencyContactRelationship" className="label">
              <span className="label-text">Relationship</span>
            </label>
            <select
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              value={formData.emergencyContactRelationship}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value="">Select relationship</option>
              <option value="parent">Parent</option>
              <option value="spouse">Spouse</option>
              <option value="sibling">Sibling</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>


          <GrnButton
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </GrnButton>

          <GreyButton
            type="button"
            onClick={() => navigate(-1)}
          >
            Back to Sign Up
          </GreyButton>
        </form>
        </GreenCard>
    </PageContainer>
  );
};

export default SignUpPage2;
