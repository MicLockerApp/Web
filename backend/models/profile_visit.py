"""
Profile Visits Model

Tracks user engagement with profiles for the Top 8 Fans feature.
Engagement is calculated based on:
1. Visit frequency (highest weight)
2. Time spent on profile (secondary weight)
3. Interactions - messages, purchases, reviews, favorites (third weight)
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProfileVisit(BaseModel):
    """Tracks a user's engagement with another user's profile"""
    visitor_id: str = Field(..., description="ID of the user who visited")
    profile_id: str = Field(..., description="ID of the profile being visited")
    visit_count: int = Field(default=1, description="Number of times visited")
    total_time_spent: int = Field(default=0, description="Total seconds spent on profile")
    interaction_count: int = Field(default=0, description="Number of interactions (messages, purchases, reviews, favorites)")
    last_visited: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProfileVisitCreate(BaseModel):
    """Request model for tracking a profile visit"""
    profile_id: str


class ProfileVisitTimeUpdate(BaseModel):
    """Request model for updating time spent on a profile"""
    profile_id: str
    seconds_spent: int = Field(..., ge=1, le=300, description="Seconds spent (max 5 min per update)")


class ProfileVisitInteraction(BaseModel):
    """Request model for tracking an interaction with a profile"""
    profile_id: str
    interaction_type: str = Field(..., description="Type: message, purchase, review, favorite")


class TopFan(BaseModel):
    """Response model for a top fan"""
    user_id: str
    username: str
    profile_image: Optional[str] = None
    rank: int
    engagement_score: float
    visit_count: int
    is_gold_member: bool = False
    is_founder: bool = False


class TopFansResponse(BaseModel):
    """Response model for top fans list"""
    fans: list[TopFan]
    visibility: str  # "public", "private", "hidden"
    total_unique_visitors: int


# Scoring weights for fan ranking
SCORING_WEIGHTS = {
    "visit_count": 50,      # Highest weight - each visit = 50 points
    "time_spent": 0.1,      # Secondary - each second = 0.1 points (6 points/min)
    "interactions": 25,     # Third - each interaction = 25 points
}


def calculate_engagement_score(visit_count: int, time_spent: int, interactions: int) -> float:
    """
    Calculate the engagement score for a fan.
    
    Weights:
    - Visit frequency: Highest (50 points per visit)
    - Time spent: Secondary (0.1 points per second = 6 points per minute)
    - Interactions: Third (25 points per interaction)
    """
    score = (
        visit_count * SCORING_WEIGHTS["visit_count"] +
        time_spent * SCORING_WEIGHTS["time_spent"] +
        interactions * SCORING_WEIGHTS["interactions"]
    )
    return round(score, 2)
