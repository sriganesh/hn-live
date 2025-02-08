export interface User {
  id: string;
  email: string;
  isProMember: boolean;
  hnUsername?: string;
  hnCookie?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
}

export interface AuthContextType extends AuthState {
  requestAuth: (email: string) => Promise<void>;
  verifyAuth: (code: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Constants
export const AUTH_TOKEN_KEY = 'hnlive_token';
export const AUTH_USER_KEY = 'hnlive_user';
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'https://localhost:8787'  // Development 
  : 'https://auth.hn.live';  // Production 