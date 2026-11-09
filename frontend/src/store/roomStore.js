import { create } from 'zustand'

export const useRoomStore = create((set, get) => ({
  currentRoom:   null,
  members:       [],
  chatHistory:   [],
  timerState:    null,
  notes:         '',
  ambientSound:  'none',
  focusScores:   {},
  activePanel:   'whiteboard',   // whiteboard | chat | flashcards | quiz | notes | ai | analytics

  setCurrentRoom:  (room)   => set({ currentRoom: room }),
  setMembers:      (members) => set({ members }),
  setChatHistory:  (msgs)   => set({ chatHistory: msgs }),
  addChatMessage:  (msg)    => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  setTimerState:   (t)      => set({ timerState: t }),
  setNotes:        (n)      => set({ notes: n }),
  setAmbientSound: (s)      => set({ ambientSound: s }),
  setActivePanel:  (p)      => set({ activePanel: p }),
  setFocusScores:  (scores) => set({ focusScores: scores }),

  reset: () => set({
    currentRoom: null, members: [], chatHistory: [],
    timerState: null, notes: '', ambientSound: 'none',
    focusScores: {}, activePanel: 'whiteboard',
  }),
}))
