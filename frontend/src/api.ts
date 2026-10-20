import type { GenerateTripInput, Trip } from './types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export type HealthStatus = {
  status: string
  ai_configured: boolean
  storage: 'supabase' | 'memory'
  model: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || 'Something went wrong. Please try again.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  health: () => request<HealthStatus>('/api/health'),
  listTrips: () => request<Trip[]>('/api/trips'),
  generateTrip: (input: GenerateTripInput) => request<Trip>('/api/trips/generate', { method: 'POST', body: JSON.stringify(input) }),
  updateTrip: (trip: Trip) => request<Trip>(`/api/trips/${trip.id}`, { method: 'PUT', body: JSON.stringify(trip) }),
  deleteTrip: (id: string) => request<void>(`/api/trips/${id}`, { method: 'DELETE' }),
  regenerateDay: (id: string, day: number) => request<Trip>(`/api/trips/${id}/days/${day}/regenerate`, { method: 'POST' }),
}
