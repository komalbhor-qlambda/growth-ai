import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, tenantAPI } from '@/api/client'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, tenant: null, isAuthenticated: false, isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        const { data } = await authAPI.login({ email, password })
        localStorage.setItem('access_token',  data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        const [me, tn] = await Promise.all([authAPI.me(), tenantAPI.get()])
        set({ user: me.data, tenant: tn.data, isAuthenticated: true, isLoading: false })
      },

      register: async (form) => {
        set({ isLoading: true })
        const { data } = await authAPI.register(form)
        localStorage.setItem('access_token',  data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        const [me, tn] = await Promise.all([authAPI.me(), tenantAPI.get()])
        set({ user: me.data, tenant: tn.data, isAuthenticated: true, isLoading: false })
      },

      logout: async () => {
        try { await authAPI.logout() } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, tenant: null, isAuthenticated: false })
      },

      refreshTenant: async () => {
        const { data } = await tenantAPI.get()
        set({ tenant: data }); return data
      },

      setTenant: (tenant) => set({ tenant }),
    }),
    {
      name: 'sme-auth',
      partialize: s => ({ user: s.user, tenant: s.tenant, isAuthenticated: s.isAuthenticated }),
    }
  )
)
