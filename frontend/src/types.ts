export type Activity = {
  time: string
  title: string
  description: string
  location: string
  category: 'sightseeing' | 'food' | 'culture' | 'adventure' | 'relaxation' | 'transport' | string
  duration_minutes: number
  estimated_cost: number
}

export type ItineraryDay = {
  day: number
  date: string
  title: string
  summary: string
  activities: Activity[]
  daily_cost: number
}

export type Trip = {
  id: string
  destination: string
  country: string
  start_date: string
  end_date: string
  travelers: number
  budget: number
  currency: string
  interests: string[]
  pace: string
  accommodation: string
  notes: string
  status: string
  summary: string
  total_estimated_cost: number
  itinerary: ItineraryDay[]
  created_at: string
}

export type GenerateTripInput = {
  destination: string
  start_date: string
  end_date: string
  travelers: number
  budget: number
  currency: string
  interests: string[]
  pace: string
  accommodation: string
  notes: string
}

