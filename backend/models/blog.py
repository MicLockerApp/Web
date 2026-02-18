"""
Blog models for MicLocker blog system.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

# Blog categories
BLOG_CATEGORIES = [
    "Industry News",
    "Gear Reviews",
    "Artist Spotlights",
    "Tips & Tutorials",
    "Studio Insights",
    "Event Coverage",
    "Behind the Scenes",
    "Announcements",
    "Community Stories",
    "Technology",
    "Business & Career",
    "Other"
]


class BlogPostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: Optional[str] = None  # Auto-generated if not provided
    content: str = Field(..., min_length=1)
    content_type: str = Field(default="rich_text")  # "rich_text" or "html"
    custom_css: Optional[str] = None  # Custom CSS for HTML content
    custom_js: Optional[str] = None  # Custom JavaScript for HTML content
    excerpt: Optional[str] = Field(None, max_length=500)
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str = Field(default="draft")  # "draft" or "published"
    allow_comments: bool = True


class BlogPostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = None
    content: Optional[str] = None
    content_type: Optional[str] = None
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    excerpt: Optional[str] = Field(None, max_length=500)
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    allow_comments: Optional[bool] = None


class BlogPostInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    content: str
    content_type: str = "rich_text"  # "rich_text" or "html"
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    status: str = "draft"  # "draft" or "published"
    allow_comments: bool = True
    
    # Author info
    author_id: str
    author_username: str
    author_profile_image: Optional[str] = None
    
    # Stats
    view_count: int = 0
    comment_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None


class BlogPostResponse(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    content_type: str
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    status: str
    allow_comments: bool
    author_id: str
    author_username: str
    author_profile_image: Optional[str] = None
    view_count: int
    comment_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None


class BlogCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class BlogCommentInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    blog_id: str
    user_id: str
    username: str
    profile_image: Optional[str] = None
    content: str
    is_approved: bool = True  # Auto-approve for now
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BlogCommentResponse(BaseModel):
    id: str
    blog_id: str
    user_id: str
    username: str
    profile_image: Optional[str] = None
    content: str
    is_approved: bool
    created_at: datetime
