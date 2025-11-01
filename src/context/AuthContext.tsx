import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '$lib/firebase/firebase.app';
import { onAuthStateChanged, getIdTokenResult, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialSurvey: boolean;
  admin: boolean;
  data: Record<string, any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialSurvey: false,
  admin: false,
  data: {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    user: null,
    loading: true,
    initialSurvey: false,
    admin: false,
    data: {},
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed');

      let claims = {
        initialSurvey: false,
        admin: false,
      };

      if (user) {
        await user.getIdToken(true);
        const idTokenResult = await getIdTokenResult(user);
        claims = idTokenResult.claims as typeof claims;
      }

      setAuthState({
        user,
        loading: false,
        initialSurvey: claims?.initialSurvey || false,
        admin: claims?.admin || false,
        data: {},
      });
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

