import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { userPool, isCognitoConfigured } from './cognito';

interface AuthContextType {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (!isCognitoConfigured) {
        setIsLoading(false);
        return;
      }
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.getSession((err: Error | null) => {
          if (!err) setUser(currentUser);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const signUp = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isCognitoConfigured) return resolve();
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
      ];
      userPool.signUp(email, password, attributes, [], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  };

  const confirmSignUp = (email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isCognitoConfigured) return resolve();
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  };

  const signIn = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isCognitoConfigured) return resolve();
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          setUser(cognitoUser);
          resolve();
        },
        onFailure: (err) => reject(err),
      });
    });
  };

  const signOut = () => {
    user?.signOut();
    setUser(null);
  };

  const getIdToken = (): Promise<string> => {
    return new Promise((resolve) => {
      try {
        if (!isCognitoConfigured) return resolve('');
        const current = user ?? userPool.getCurrentUser();
        if (!current) return resolve('');
        current.getSession((err: Error | null, session: any) => {
          if (err || !session) return resolve('');
          resolve(session.getIdToken().getJwtToken());
        });
      } catch {
        resolve('');
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signUp, signIn, signOut, confirmSignUp, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
