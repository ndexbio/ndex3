import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { SearchStore } from '@/types/stores/search-store'

/**
 * Search store that manages the search query and history
 *
 */
export const useSearchStore = create<SearchStore>()(
  persist(
    immer((set, get) => ({
      query: '',
      previousQueries: [],
      searchCount: 0,
      lastSearchTime: null,

      setQuery: (query: string) => {
        set((state) => {
          state.query = query
          state.lastSearchTime = Date.now()
          state.searchCount += 1
        })

        // Only add non-empty queries to history
        if (query.trim()) {
          get().addToHistory(query)
        }
      },

      clearQuery: () =>
        set((state) => {
          state.query = ''
        }),

      addToHistory: (query: string) => {
        const trimmedQuery = query.trim()
        if (!trimmedQuery) return

        set((state) => {
          // Filter out duplicates and keep only the latest 10 queries
          state.previousQueries = [
            trimmedQuery,
            ...state.previousQueries.filter((q) => q !== trimmedQuery),
          ].slice(0, 10)
        })
      },

      clearHistory: () =>
        set((state) => {
          state.previousQueries = []
        }),
    })),
    {
      name: 'ndex-search-storage', // name for the persisted store in localStorage
      partialize: (state) => ({
        // Only persist search history — query is derived from URL
        previousQueries: state.previousQueries,
      }),
    },
  ),
)
