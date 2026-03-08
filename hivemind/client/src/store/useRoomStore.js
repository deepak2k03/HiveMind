import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRoomStore = create(
  persist(
    (set, get) => ({
      // Standard React State (Triggers UI re-renders for text/menus)
      roomId: null,
      peers: 0,
      isTraining: false,
      currentRound: 0,
      globalWeights: null,
      workHistory: [],

      // MUTABLE State for 3D physics (Does NOT trigger React re-renders)
      visualState: {
        laserPulseIntensity: 0,
        coreRotationSpeed: 0.2,
      },

      setRoomState: (data) =>
        set((state) => ({
          ...state,
          ...data,
          roomId: data.roomId ? String(data.roomId).trim().toUpperCase() : state.roomId,
        })),

      resetRoom: () =>
        set({
          roomId: null,
          peers: 0,
          isTraining: false,
          currentRound: 0,
          globalWeights: null,
        }),

      addWorkSnapshot: ({ roomId, round, peers }) => {
        const normalizedRoom = String(roomId || '').trim().toUpperCase();
        if (!normalizedRoom) {
          return;
        }

        const nextSnapshot = {
          id: `${normalizedRoom}-${Date.now()}`,
          roomId: normalizedRoom,
          round: Number(round || 0),
          peers: Number(peers || 0),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          const withoutCurrentRoom = state.workHistory.filter((item) => item.roomId !== normalizedRoom);
          return {
            workHistory: [nextSnapshot, ...withoutCurrentRoom].slice(0, 10),
          };
        });
      },

      clearWorkHistory: () => set({ workHistory: [] }),

      // Called locally by the TF.js Web Worker every time a batch finishes
      fireTrainingPulse: () => {
        const { visualState } = get();
        visualState.laserPulseIntensity = 1.0;
        visualState.coreRotationSpeed = 2.0;
      },
    }),
    {
      name: 'hivemind-room',
      partialize: (state) => ({
        roomId: state.roomId,
        currentRound: state.currentRound,
        workHistory: state.workHistory,
      }),
    }
  )
);