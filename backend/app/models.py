from datetime import date, datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


class GenerateTripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    travelers: int = Field(default=1, ge=1, le=20)
    budget: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    interests: list[str] = Field(default_factory=list, max_length=12)
    pace: Literal["Relaxed", "Balanced", "Packed"] = "Balanced"
    accommodation: str = Field(default="Boutique hotel", max_length=80)
    notes: str = Field(default="", max_length=1200)

    @model_validator(mode="after")
    def dates_are_valid(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after the start date")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Trips are limited to 31 days")
        return self


class Activity(BaseModel):
    time: str
    title: str
    description: str
    location: str
    category: str
    duration_minutes: int = Field(ge=15, le=720)
    estimated_cost: float = Field(ge=0)


class ItineraryDay(BaseModel):
    day: int = Field(ge=1)
    date: str
    title: str
    summary: str
    activities: list[Activity]
    daily_cost: float = Field(ge=0)


class GeneratedItinerary(BaseModel):
    country: str
    summary: str
    total_estimated_cost: float = Field(ge=0)
    itinerary: list[ItineraryDay]


class Trip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    destination: str
    country: str = ""
    start_date: str
    end_date: str
    travelers: int
    budget: float
    currency: str
    interests: list[str]
    pace: str
    accommodation: str
    notes: str = ""
    status: str = "upcoming"
    summary: str
    total_estimated_cost: float
    itinerary: list[ItineraryDay]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RegeneratedDay(BaseModel):
    day: ItineraryDay

