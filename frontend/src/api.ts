import type { GenerateTripInput, Trip } from './types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || 'Something went wrong. Please try again.')
  }
  return response.json() as Promise<T>
}

export const api = {
  listTrips: () => request<Trip[]>('/api/trips'),
  generateTrip: (input: GenerateTripInput) => request<Trip>('/api/trips/generate', { method: 'POST', body: JSON.stringify(input) }),
  updateTrip: (trip: Trip) => request<Trip>(`/api/trips/${trip.id}`, { method: 'PUT', body: JSON.stringify(trip) }),
  deleteTrip: (id: string) => request<void>(`/api/trips/${id}`, { method: 'DELETE' }),
  regenerateDay: (id: string, day: number) => request<Trip>(`/api/trips/${id}/days/${day}/regenerate`, { method: 'POST' }),
}
