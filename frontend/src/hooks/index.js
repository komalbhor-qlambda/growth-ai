import React, { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/authStore'

export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  useEffect(() => { if (!isAuthenticated) navigate('/login', { replace: true }) }, [isAuthenticated, navigate])
  return isAuthenticated
}

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = React.useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — SME Growth AI` : 'SME Growth AI'
    return () => { document.title = 'SME Growth AI' }
  }, [title])
}
