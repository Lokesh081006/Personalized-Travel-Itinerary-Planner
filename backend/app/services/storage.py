from typing import Protocol

import httpx

from ..config import Settings
from ..models import Trip


class TripStorage(Protocol):
    async def list(self) -> list[Trip]: ...
    async def get(self, trip_id: str) -> Trip | None: ...
    async def save(self, trip: Trip) -> Trip: ...
    async def delete(self, trip_id: str) -> bool: ...


class MemoryStorage:
    def __init__(self):
        self.trips: dict[str, Trip] = {}

    async def list(self) -> list[Trip]:
        return sorted(self.trips.values(), key=lambda trip: trip.created_at, reverse=True)

    async def get(self, trip_id: str) -> Trip | None:
        return self.trips.get(trip_id)

    async def save(self, trip: Trip) -> Trip:
        self.trips[trip.id] = trip
        return trip

    async def delete(self, trip_id: str) -> bool:
        return self.trips.pop(trip_id, None) is not None


class SupabaseStorage:
    def __init__(self, settings: Settings):
        self.url = f"{settings.supabase_url.rstrip('/')}/rest/v1/trips"
        key = settings.supabase_key
        self.headers = {
            "apikey": key,
            "Content-Type": "application/json",
        }
        # Legacy service_role keys are JWTs and use Bearer auth. New
        # sb_secret keys are sent only through the apikey header.
        if not key.startswith("sb_secret_"):
            self.headers["Authorization"] = f"Bearer {key}"

    async def list(self) -> list[Trip]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(self.url, headers=self.headers, params={"select": "*", "order": "created_at.desc"})
            response.raise_for_status()
        return [Trip.model_validate(self._from_row(row)) for row in response.json()]

    async def get(self, trip_id: str) -> Trip | None:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(self.url, headers=self.headers, params={"id": f"eq.{trip_id}", "select": "*", "limit": "1"})
            response.raise_for_status()
        rows = response.json()
        return Trip.model_validate(self._from_row(rows[0])) if rows else None

    async def save(self, trip: Trip) -> Trip:
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.url, headers=headers, json=self._to_row(trip))
            response.raise_for_status()
        rows = response.json()
        return Trip.model_validate(self._from_row(rows[0])) if rows else trip

    async def delete(self, trip_id: str) -> bool:
        headers = {**self.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.delete(self.url, headers=headers, params={"id": f"eq.{trip_id}"})
            response.raise_for_status()
        return bool(response.json())

    @staticmethod
    def _to_row(trip: Trip) -> dict:
        data = trip.model_dump(mode="json")
        itinerary = data.pop("itinerary")
        interests = data.pop("interests")
        data["itinerary"] = itinerary
        data["interests"] = interests
        return data

    @staticmethod
    def _from_row(row: dict) -> dict:
        return row


def build_storage(settings: Settings) -> TripStorage:
    return SupabaseStorage(settings) if settings.supabase_configured else MemoryStorage()
