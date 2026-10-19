from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .agents import TravelAgent
from .config import get_settings
from .models import GenerateTripRequest, Trip
from .services.storage import TripStorage, build_storage


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.storage = build_storage(settings)
    app.state.travel_agent = TravelAgent(settings)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def storage(request: Request) -> TripStorage:
    return request.app.state.storage


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "ai_configured": settings.llm_configured,
        "storage": "supabase" if settings.supabase_configured else "memory",
        "model": settings.openai_model,
    }


@app.get("/api/trips", response_model=list[Trip])
async def list_trips(request: Request):
    return await storage(request).list()


@app.get("/api/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str, request: Request):
    trip = await storage(request).get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.post("/api/trips/generate", response_model=Trip, status_code=status.HTTP_201_CREATED)
async def generate_trip(payload: GenerateTripRequest, request: Request):
    generated = await request.app.state.travel_agent.plan_trip(payload)
    trip = Trip(
        **payload.model_dump(mode="json"),
        country=generated.country,
        summary=generated.summary,
        total_estimated_cost=generated.total_estimated_cost,
        itinerary=generated.itinerary,
    )
    return await storage(request).save(trip)


@app.put("/api/trips/{trip_id}", response_model=Trip)
async def update_trip(trip_id: str, trip: Trip, request: Request):
    if trip_id != trip.id:
        raise HTTPException(status_code=400, detail="Trip ID does not match request path")
    return await storage(request).save(trip)


@app.post("/api/trips/{trip_id}/days/{day_number}/regenerate", response_model=Trip)
async def regenerate_day(trip_id: str, day_number: int, request: Request):
    trip = await storage(request).get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if day_number < 1 or day_number > len(trip.itinerary):
        raise HTTPException(status_code=404, detail="Day not found")
    new_day = await request.app.state.travel_agent.revise_day(trip, day_number)
    trip.itinerary[day_number - 1] = new_day
    trip.total_estimated_cost = sum(day.daily_cost for day in trip.itinerary)
    return await storage(request).save(trip)


@app.delete("/api/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: str, request: Request):
    deleted = await storage(request).delete(trip_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Trip not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
