"""The AI agent responsible for planning and revising travel itineraries."""

import json
import re

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ..config import Settings
from ..models import GeneratedItinerary, ItineraryDay, Trip
from ..prompts import SYSTEM_PROMPT, day_prompt, trip_prompt


class TravelAgent:
    """A focused planning agent backed by any OpenAI-compatible chat API.

    The agent owns prompt construction, model communication, removal of Qwen
    thinking tags, and schema validation. API routes only pass domain objects in
    and receive validated itinerary objects back.
    """

    def __init__(self, settings: Settings):
        self.settings = settings

    async def plan_trip(self, request) -> GeneratedItinerary:
        content = await self._chat(SYSTEM_PROMPT, trip_prompt(request))
        try:
            return GeneratedItinerary.model_validate(self._extract_json(content))
        except (ValidationError, json.JSONDecodeError, ValueError) as exc:
            raise HTTPException(status_code=502, detail=f"The travel agent returned an invalid itinerary: {exc}") from exc

    async def revise_day(self, trip: Trip, day_number: int) -> ItineraryDay:
        content = await self._chat(
            "You are the Roamly travel planning agent. Return only the requested valid JSON object, with no markdown or thinking trace.",
            day_prompt(trip, day_number),
        )
        try:
            data = self._extract_json(content)
            return ItineraryDay.model_validate(data["day"])
        except (ValidationError, json.JSONDecodeError, ValueError, KeyError) as exc:
            raise HTTPException(status_code=502, detail=f"The travel agent returned an invalid day plan: {exc}") from exc

    async def _chat(self, system: str, user: str) -> str:
        if not self.settings.llm_configured:
            raise HTTPException(
                status_code=503,
                detail="AI is not configured. Set OPENAI_BASE_URL, OPENAI_API_KEY, and OPENAI_MODEL in .env.",
            )

        url = f"{self.settings.openai_base_url.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.settings.openai_api_key:
            headers["Authorization"] = f"Bearer {self.settings.openai_api_key}"

        body = {
            "model": self.settings.openai_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.65,
            "max_tokens": 7000,
            "response_format": {"type": "json_object"},
        }
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=10.0)) as client:
                response = await client.post(url, headers=headers, json=body)
                response.raise_for_status()
                payload = response.json()
            return payload["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise HTTPException(status_code=502, detail=f"AI server error ({exc.response.status_code}): {detail}") from exc
        except (httpx.RequestError, KeyError, IndexError, TypeError) as exc:
            raise HTTPException(status_code=502, detail=f"Could not reach or read the AI server: {exc}") from exc

    @staticmethod
    def _extract_json(text: str) -> dict:
        # Qwen reasoning models may wrap private reasoning in <think> tags.
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE).strip()
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start < 0 or end < start:
            raise ValueError("No JSON object found")
        return json.loads(cleaned[start : end + 1])

