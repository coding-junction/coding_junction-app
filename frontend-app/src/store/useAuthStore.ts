import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_core_member?: boolean;
  verification_status?: string;
  is_verified?: boolean;
  college_name?: string;
  department?: string;
  year?: number;
  semester?: number;
  favorite_subjects?: string;
  cgpa?: number;
  roll_no?: string;
  batch?: string;
  is_identity_verified?: boolean;
  id_card_path?: string;
  fcm_token?: string;
  welcome_shown?: boolean;
  profile_image_path?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isHydrated: false,
      login: (user, token) => {
        setAuthToken(token);
        set({ user, token });
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null });
      },
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error during hydration:', error);
        }
        if (state) {
          state.setHydrated();
          if (state.token) {
            setAuthToken(state.token);
          }
        } else {
          // If state is null, we should still mark as hydrated
          useAuthStore.setState({ isHydrated: true });
        }
      },
    }
  )
);
