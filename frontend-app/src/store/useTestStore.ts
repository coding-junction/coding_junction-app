import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestState {
  activeTestId: string | null;
  submissionId: string | null;
  violations: number;
  pending_lockdown: boolean;
  isHydrated: boolean;
  startTest: (testId: string, submissionId: string) => void;
  addViolation: () => void;
  setPendingLockdown: (status: boolean) => void;
  clearTest: () => void;
  setHydrated: () => void;
}

export const useTestStore = create<TestState>()(
  persist(
    (set) => ({
      activeTestId: null,
      submissionId: null,
      violations: 0,
      pending_lockdown: false,
      isHydrated: false,
      startTest: (testId, submissionId) => set({ activeTestId: testId, submissionId, violations: 0, pending_lockdown: false }),
      addViolation: () => set((state) => ({ violations: state.violations + 1 })),
      setPendingLockdown: (status) => set({ pending_lockdown: status }),
      clearTest: () => set({ activeTestId: null, submissionId: null, violations: 0, pending_lockdown: false }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'test-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error during hydration:', error);
        }
        if (state) {
          state.setHydrated();
        } else {
          useTestStore.setState({ isHydrated: true });
        }
      },
    }
  )
);
