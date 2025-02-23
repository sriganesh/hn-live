import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User, AuthState, AuthResponse, AUTH_TOKEN_KEY, AUTH_USER_KEY, API_BASE_URL } from '../types/auth';
import { syncFollowing } from '../services/following';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAuthenticating: false
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          isAuthenticating: false
        });
      } catch (error) {
        console.error('Error parsing stored auth:', error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated) {
      // Sync following when user logs in
      syncFollowing().catch(console.error);
    }
  }, [authState.isAuthenticated]);

  const requestAuth = async (email: string) => {
    try {
      setAuthState(prev => ({ ...prev, isAuthenticating: true }));
      
      const response = await fetch(`${API_BASE_URL}/auth/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request authentication');
      }

      await response.json(); // Contains { success: true }
    } catch (error) {
      console.error('Auth request error:', error);
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  };

  const verifyAuth = async (code: string, email: string) => {
    try {
      setAuthState(prev => ({ ...prev, isAuthenticating: true }));

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          code 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify code');
      }

      const { token, user }: AuthResponse = await response.json();

      // Store auth data
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isAuthenticating: false
      });
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  };

  const logout = async () => {
    try {
      console.log('Starting logout process');
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      
      // First update the state to prevent any race conditions
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAuthenticating: false
      });

      // Then clear localStorage
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);

      // Finally, make the API call (don't wait for it)
      if (token) {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }).catch(error => {
          console.error('Non-critical logout error:', error);
        });
      }
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Critical logout error:', error);
      // Even if there's an error, ensure the user is logged out locally
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAuthenticating: false
      });
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || !authState.user) {
      throw new Error('No user logged in');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const updatedUser = { ...authState.user, ...data };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        ...authState,
        requestAuth,
        verifyAuth,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 