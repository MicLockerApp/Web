"""
Blog routes for MicLocker blog system.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
import re
import logging

from models.blog import (
    BlogPostCreate, BlogPostUpdate, BlogPostInDB, BlogPostResponse,
    BlogCommentCreate, BlogCommentInDB, BlogCommentResponse,
    BLOG_CATEGORIES
)
from services.auth import get_current_user, get_current_user_optional
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/blogs", tags=["blogs"])


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title."""
    slug = title.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug


def can_manage_blogs(user: dict) -> bool:
    """Check if user can create/edit blog posts."""
    if not user:
        return False
    # Owner can always manage blogs
    if user.get("role") == "owner":
        return True
    # Check for blog_editor permission
    if user.get("is_blog_editor"):
        return True
    return False


def can_publish_blogs(user: dict) -> bool:
    """Check if user can publish blog posts."""
    if not user:
        return False
    # Only owner can publish
    return user.get("role") == "owner"


# ============================================================
# PUBLIC ENDPOINTS
# ============================================================

@router.get("/categories", response_model=List[str])
async def get_blog_categories():
    """Get all available blog categories."""
    return BLOG_CATEGORIES


@router.get("/", response_model=List[BlogPostResponse])
async def get_blog_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = "published",
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get blog posts. Public users only see published posts."""
    db = get_database()
    query = {}
    
    # Public users only see published posts
    if not can_manage_blogs(current_user):
        query["status"] = "published"
    elif status:
        query["status"] = status
    
    if category:
        query["category"] = category
    
    if tag:
        query["tags"] = tag
    
    cursor = db.blogs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    posts = []
    async for post in cursor:
        post["id"] = str(post.pop("_id"))
        posts.append(BlogPostResponse(**post))
    
    return posts


@router.get("/{slug_or_id}", response_model=BlogPostResponse)
async def get_blog_post(
    slug_or_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get a single blog post by slug or ID."""
    db = get_database()
    # Try to find by slug first, then by ID
    post = await db.blogs.find_one({"slug": slug_or_id})
    if not post:
        post = await db.blogs.find_one({"id": slug_or_id})
    
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Check if post is published or user can manage blogs
    if post.get("status") != "published" and not can_manage_blogs(current_user):
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Increment view count
    await db.blogs.update_one(
        {"_id": post["_id"]},
        {"$inc": {"view_count": 1}}
    )
    
    post["id"] = str(post.pop("_id"))
    post["view_count"] = post.get("view_count", 0) + 1
    return BlogPostResponse(**post)


@router.get("/{blog_id}/comments", response_model=List[BlogCommentResponse])
async def get_blog_comments(
    blog_id: str,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0)
):
    """Get comments for a blog post."""
    db = get_database()
    cursor = db.blog_comments.find(
        {"blog_id": blog_id, "is_approved": True}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    comments = []
    async for comment in cursor:
        comment["id"] = str(comment.pop("_id"))
        comments.append(BlogCommentResponse(**comment))
    
    return comments


# ============================================================
# AUTHENTICATED USER ENDPOINTS
# ============================================================

@router.post("/{blog_id}/comments", response_model=BlogCommentResponse)
async def create_comment(
    blog_id: str,
    comment_data: BlogCommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a blog post."""
    db = get_database()
    # Check if blog exists and allows comments
    post = await db.blogs.find_one({"id": blog_id, "status": "published"})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    if not post.get("allow_comments", True):
        raise HTTPException(status_code=400, detail="Comments are disabled for this post")
    
    comment = BlogCommentInDB(
        blog_id=blog_id,
        user_id=current_user["id"],
        username=current_user["username"],
        profile_image=current_user.get("profile_image"),
        content=comment_data.content
    )
    
    comment_dict = comment.model_dump()
    comment_dict["_id"] = comment_dict.pop("id")
    
    await db.blog_comments.insert_one(comment_dict)
    
    # Update comment count
    await db.blogs.update_one(
        {"id": blog_id},
        {"$inc": {"comment_count": 1}}
    )
    
    comment_dict["id"] = str(comment_dict.pop("_id"))
    return BlogCommentResponse(**comment_dict)


# ============================================================
# BLOG EDITOR/OWNER ENDPOINTS
# ============================================================

@router.post("", response_model=BlogPostResponse)
async def create_blog_post(
    post_data: BlogPostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new blog post. Only owner and blog editors can create posts."""
    db = get_database()
    if not can_manage_blogs(current_user):
        raise HTTPException(status_code=403, detail="You don't have permission to create blog posts")
    
    # Generate slug if not provided
    slug = post_data.slug or generate_slug(post_data.title)
    
    # Check if slug is unique
    existing = await db.blogs.find_one({"slug": slug})
    if existing:
        # Append timestamp to make unique
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    
    # Only owner can publish directly
    status = post_data.status
    if status == "published" and not can_publish_blogs(current_user):
        status = "draft"  # Force to draft if not owner
    
    post = BlogPostInDB(
        title=post_data.title,
        slug=slug,
        content=post_data.content,
        content_type=post_data.content_type,
        custom_css=post_data.custom_css,
        custom_js=post_data.custom_js,
        excerpt=post_data.excerpt,
        featured_image=post_data.featured_image,
        category=post_data.category,
        tags=post_data.tags or [],
        status=status,
        allow_comments=post_data.allow_comments,
        author_id=current_user["id"],
        author_username=current_user["username"],
        author_profile_image=current_user.get("profile_image"),
        published_at=datetime.now(timezone.utc) if status == "published" else None
    )
    
    post_dict = post.model_dump()
    post_dict["_id"] = post_dict.pop("id")
    
    await db.blogs.insert_one(post_dict)
    
    logger.info(f"Blog post created: {post.title} by {current_user['username']}")
    
    post_dict["id"] = str(post_dict.pop("_id"))
    return BlogPostResponse(**post_dict)


@router.put("/{blog_id}", response_model=BlogPostResponse)
async def update_blog_post(
    blog_id: str,
    post_data: BlogPostUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a blog post."""
    db = get_database()
    if not can_manage_blogs(current_user):
        raise HTTPException(status_code=403, detail="You don't have permission to edit blog posts")
    
    post = await db.blogs.find_one({"id": blog_id})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Build update dict
    update_data = {}
    
    if post_data.title is not None:
        update_data["title"] = post_data.title
    
    if post_data.slug is not None:
        # Check if new slug is unique
        existing = await db.blogs.find_one({"slug": post_data.slug, "id": {"$ne": blog_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Slug already exists")
        update_data["slug"] = post_data.slug
    
    if post_data.content is not None:
        update_data["content"] = post_data.content
    
    if post_data.content_type is not None:
        update_data["content_type"] = post_data.content_type
    
    if post_data.custom_css is not None:
        update_data["custom_css"] = post_data.custom_css
    
    if post_data.custom_js is not None:
        update_data["custom_js"] = post_data.custom_js
    
    if post_data.excerpt is not None:
        update_data["excerpt"] = post_data.excerpt
    
    if post_data.featured_image is not None:
        update_data["featured_image"] = post_data.featured_image
    
    if post_data.category is not None:
        update_data["category"] = post_data.category
    
    if post_data.tags is not None:
        update_data["tags"] = post_data.tags
    
    if post_data.allow_comments is not None:
        update_data["allow_comments"] = post_data.allow_comments
    
    # Handle status changes
    if post_data.status is not None:
        if post_data.status == "published":
            if not can_publish_blogs(current_user):
                raise HTTPException(status_code=403, detail="Only the owner can publish blog posts")
            update_data["status"] = "published"
            if not post.get("published_at"):
                update_data["published_at"] = datetime.now(timezone.utc)
        else:
            update_data["status"] = post_data.status
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.blogs.update_one({"id": blog_id}, {"$set": update_data})
    
    # Get updated post
    updated_post = await db.blogs.find_one({"id": blog_id})
    updated_post["id"] = str(updated_post.pop("_id"))
    
    logger.info(f"Blog post updated: {blog_id} by {current_user['username']}")
    
    return BlogPostResponse(**updated_post)


@router.delete("/{blog_id}")
async def delete_blog_post(
    blog_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a blog post. Only owner can delete."""
    db = get_database()
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can delete blog posts")
    
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    # Delete associated comments
    await db.blog_comments.delete_many({"blog_id": blog_id})
    
    logger.info(f"Blog post deleted: {blog_id} by {current_user['username']}")
    
    return {"message": "Blog post deleted successfully"}


# ============================================================
# ADMIN ENDPOINTS
# ============================================================

@router.delete("/{blog_id}/comments/{comment_id}")
async def delete_comment(
    blog_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a comment. Owner, blog editors, or comment author can delete."""
    db = get_database()
    comment = await db.blog_comments.find_one({"id": comment_id, "blog_id": blog_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check permissions
    is_owner = current_user.get("role") == "owner"
    is_blog_editor = current_user.get("is_blog_editor")
    is_comment_author = comment.get("user_id") == current_user["id"]
    
    if not (is_owner or is_blog_editor or is_comment_author):
        raise HTTPException(status_code=403, detail="You don't have permission to delete this comment")
    
    await db.blog_comments.delete_one({"id": comment_id})
    
    # Update comment count
    await db.blogs.update_one(
        {"id": blog_id},
        {"$inc": {"comment_count": -1}}
    )
    
    return {"message": "Comment deleted successfully"}
