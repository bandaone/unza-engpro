import { create } from 'zustand';
import { authService, LoginCredentials, User } from '../services/authService';

interface AuthState {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: authService.getCurrentUser(),
  login: async (credentials) => {
    const { user } = await authService.login(credentials);
    set({ user });
    return user;
  },
  logout: () => {
    authService.logout();
    set({ user: null });
  },
  isAuthenticated: () => !!get().user,
}));
