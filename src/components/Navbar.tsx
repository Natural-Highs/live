import type React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, admin } = useAuth();

  return (
    <nav className="navbar bg-base-200">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          Natural Highs
        </Link>
      </div>
      <div className="flex-none">
        {user ? (
          <>
            {admin && (
              <Link to="/admin" className="btn btn-ghost">
                Admin
              </Link>
            )}
            <Link to="/dashboard" className="btn btn-ghost">
              Dashboard
            </Link>
            <button type="button" className="btn btn-ghost">
              Logout
            </button>
          </>
        ) : (
          <Link to="/authentication" className="btn btn-ghost">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
