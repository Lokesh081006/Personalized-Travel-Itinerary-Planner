from .models import GenerateTripRequest, Trip


SYSTEM_PROMPT = """You are Roamly, an expert travel designer. Create realistic, logistically sensible,
personalized itineraries. Never invent opening hours as facts. Keep nearby activities together, allow
travel and rest time, honor the stated budget, and avoid over-scheduling. Return ONLY valid JSON with
double-quoted keys and values. Do not include markdown fences, commentary, or a thinking trace.

The required JSON shape is:
{
  "country": "country name",
  "summary": "two warm, specific sentences about the trip",
  "total_estimated_cost": 1234,
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "short evocative title",
      "summary": "one sentence",
      "daily_cost": 250,
      "activities": [
        {
          "time": "09:00",
          "title": "activity name",
          "description": "one useful sentence",
          "location": "specific area or venue",
          "category": "sightseeing|food|culture|adventure|relaxation|transport",
          "duration_minutes": 90,
          "estimated_cost": 25
        }
      ]
    }
  ]
}

Costs must be numbers in the user's currency and cover the full group. Include 3-5 activities per day.
The itinerary must contain exactly one object per calendar day, including arrival and departure days."""


def trip_prompt(request: GenerateTripRequest) -> str:
    interests = ", ".join(request.interests) or "general highlights"
    return f"""Design this trip:
- Destination: {request.destination}
- Dates: {request.start_date.isoformat()} through {request.end_date.isoformat()}
- Travelers: {request.travelers}
- Total budget: {request.currency} {request.budget:.0f}
- Interests: {interests}
- Pace: {request.pace}
- Accommodation preference: {request.accommodation}
- Special notes: {request.notes or 'None'}

Keep the total estimate within budget. Include meals and transportation suggestions, and reflect the
requested pace. Use accurate date strings for every day."""


def day_prompt(trip: Trip, day_number: int) -> str:
    existing = trip.itinerary[day_number - 1]
    return f"""Regenerate day {day_number} only for this trip to {trip.destination}, {trip.country}.
Date: {existing.date}. Travelers: {trip.travelers}. Currency: {trip.currency}.
Interests: {', '.join(trip.interests)}. Pace: {trip.pace}. Stay: {trip.accommodation}.
Overall trip summary: {trip.summary}

Return ONLY JSON in this exact shape:
{{"day": {{"day": {day_number}, "date": "{existing.date}", "title": "...", "summary": "...",
"daily_cost": 0, "activities": [{{"time":"09:00","title":"...","description":"...",
"location":"...","category":"culture","duration_minutes":90,"estimated_cost":0}}]}}}}
Provide 3-5 realistic activities, grouped geographically, with breaks and travel time."""

