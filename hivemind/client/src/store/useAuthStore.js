import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
	persist(
		(set) => ({
			token: null,
			user: null,
			isAuthenticated: false,
			hasHydrated: false,

			setSession: ({ token, user }) =>
				set({
					token,
					user,
					isAuthenticated: Boolean(token),
				}),

			clearSession: () =>
				set({
					token: null,
					user: null,
					isAuthenticated: false,
				}),

			setHydrated: (value) => set({ hasHydrated: value }),
		}),
		{
			name: 'hivemind-auth',
			partialize: (state) => ({
				token: state.token,
				user: state.user,
				isAuthenticated: state.isAuthenticated,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true);
			},
		}
	)
);
