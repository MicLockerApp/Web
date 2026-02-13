"""
Learn Section API Tests

Tests for the educational content platform including:
- Channel management
- Playlist and video management
- Subscriptions and favorites
- Reviews
- Search functionality
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_CHANNEL_ID = "22aabf14-d8fe-4868-b670-ee6db1804d4a"
TEST_PLAYLIST_ID = "8dd01f72-3436-4642-9112-9b7b4650715c"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        params={"username": "miclocker.support", "password": "Eisenhower1212!!"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestLearnPublicEndpoints:
    """Test public Learn API endpoints (no auth required)"""
    
    def test_get_banners(self, api_client):
        """Test GET /api/learn/banners"""
        response = api_client.get(f"{BASE_URL}/api/learn/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} banners")
    
    def test_get_channels(self, api_client):
        """Test GET /api/learn/channels"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} channels")
        
        # Verify channel structure if data exists
        if data:
            channel = data[0]
            assert "id" in channel
            assert "name" in channel
            assert "user_id" in channel
            assert "owner_username" in channel
    
    def test_get_channels_with_filters(self, api_client):
        """Test GET /api/learn/channels with filters"""
        # Test category filter
        response = api_client.get(f"{BASE_URL}/api/learn/channels?category=audio_engineer")
        assert response.status_code == 200
        
        # Test search filter
        response = api_client.get(f"{BASE_URL}/api/learn/channels?search=MicLocker")
        assert response.status_code == 200
        
        # Test sort options
        for sort_by in ["newest", "popular", "rating"]:
            response = api_client.get(f"{BASE_URL}/api/learn/channels?sort_by={sort_by}")
            assert response.status_code == 200
    
    def test_get_trending_channels(self, api_client):
        """Test GET /api/learn/channels/trending"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels/trending?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        print(f"Found {len(data)} trending channels")
    
    def test_get_specific_channel(self, api_client):
        """Test GET /api/learn/channels/{channel_id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels/{TEST_CHANNEL_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify channel data
        assert data["id"] == TEST_CHANNEL_ID
        assert data["name"] == "MicLocker Pro Tips"
        assert "owner_username" in data
        assert "subscriber_count" in data
    
    def test_get_channel_not_found(self, api_client):
        """Test GET /api/learn/channels/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels/invalid-channel-id")
        assert response.status_code == 404
    
    def test_get_channel_content(self, api_client):
        """Test GET /api/learn/channels/{channel_id}/content"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels/{TEST_CHANNEL_ID}/content")
        assert response.status_code == 200
        data = response.json()
        
        # Verify content structure
        assert "free_videos" in data
        assert "playlists" in data
        assert "subscription_tiers" in data
        assert isinstance(data["free_videos"], list)
        assert isinstance(data["playlists"], list)
        assert isinstance(data["subscription_tiers"], list)
    
    def test_get_channel_tiers(self, api_client):
        """Test GET /api/learn/channels/{channel_id}/tiers"""
        response = api_client.get(f"{BASE_URL}/api/learn/channels/{TEST_CHANNEL_ID}/tiers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_playlists(self, api_client):
        """Test GET /api/learn/playlists"""
        response = api_client.get(f"{BASE_URL}/api/learn/playlists")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} playlists")
        
        # Verify playlist structure if data exists
        if data:
            playlist = data[0]
            assert "id" in playlist
            assert "title" in playlist
            assert "channel_id" in playlist
            assert "owner_username" in playlist
    
    def test_get_playlists_with_filters(self, api_client):
        """Test GET /api/learn/playlists with filters"""
        # Test free_only filter
        response = api_client.get(f"{BASE_URL}/api/learn/playlists?free_only=true")
        assert response.status_code == 200
        
        # Test category filter
        response = api_client.get(f"{BASE_URL}/api/learn/playlists?category=audio_engineer")
        assert response.status_code == 200
        
        # Test sort options
        for sort_by in ["newest", "popular", "rating", "price_low", "price_high"]:
            response = api_client.get(f"{BASE_URL}/api/learn/playlists?sort_by={sort_by}")
            assert response.status_code == 200
    
    def test_get_specific_playlist(self, api_client):
        """Test GET /api/learn/playlists/{playlist_id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/playlists/{TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify playlist data
        assert data["id"] == TEST_PLAYLIST_ID
        assert data["title"] == "Audio Mixing Fundamentals"
        assert "owner_username" in data
        assert "channel_name" in data
    
    def test_get_playlist_not_found(self, api_client):
        """Test GET /api/learn/playlists/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/learn/playlists/invalid-playlist-id")
        assert response.status_code == 404
    
    def test_get_videos(self, api_client):
        """Test GET /api/learn/videos"""
        response = api_client.get(f"{BASE_URL}/api/learn/videos")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} videos")
        
        # Verify video structure if data exists
        if data:
            video = data[0]
            assert "id" in video
            assert "title" in video
            assert "video_url" in video
            assert "channel_id" in video
    
    def test_get_videos_by_playlist(self, api_client):
        """Test GET /api/learn/videos?playlist_id={id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/videos?playlist_id={TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All videos should belong to the playlist
        for video in data:
            assert video["playlist_id"] == TEST_PLAYLIST_ID
    
    def test_get_videos_by_channel(self, api_client):
        """Test GET /api/learn/videos?channel_id={id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/videos?channel_id={TEST_CHANNEL_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All videos should belong to the channel
        for video in data:
            assert video["channel_id"] == TEST_CHANNEL_ID
    
    def test_get_specific_video(self, api_client):
        """Test GET /api/learn/videos/{video_id}"""
        # First get a video ID
        response = api_client.get(f"{BASE_URL}/api/learn/videos?limit=1")
        assert response.status_code == 200
        videos = response.json()
        
        if videos:
            video_id = videos[0]["id"]
            response = api_client.get(f"{BASE_URL}/api/learn/videos/{video_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == video_id
    
    def test_get_video_not_found(self, api_client):
        """Test GET /api/learn/videos/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/learn/videos/invalid-video-id")
        assert response.status_code == 404
    
    def test_search(self, api_client):
        """Test GET /api/learn/search"""
        response = api_client.get(f"{BASE_URL}/api/learn/search?q=audio")
        assert response.status_code == 200
        data = response.json()
        
        # Verify search result structure
        assert "channels" in data
        assert "playlists" in data
        assert "videos" in data
        assert isinstance(data["channels"], list)
        assert isinstance(data["playlists"], list)
        assert isinstance(data["videos"], list)
    
    def test_search_with_type_filter(self, api_client):
        """Test GET /api/learn/search with type filter"""
        # Search only channels
        response = api_client.get(f"{BASE_URL}/api/learn/search?q=audio&type=channel")
        assert response.status_code == 200
        
        # Search only playlists
        response = api_client.get(f"{BASE_URL}/api/learn/search?q=audio&type=playlist")
        assert response.status_code == 200
        
        # Search only videos
        response = api_client.get(f"{BASE_URL}/api/learn/search?q=audio&type=video")
        assert response.status_code == 200
    
    def test_get_reviews_for_channel(self, api_client):
        """Test GET /api/learn/reviews/channel/{channel_id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/reviews/channel/{TEST_CHANNEL_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_reviews_for_playlist(self, api_client):
        """Test GET /api/learn/reviews/playlist/{playlist_id}"""
        response = api_client.get(f"{BASE_URL}/api/learn/reviews/playlist/{TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestLearnAuthenticatedEndpoints:
    """Test authenticated Learn API endpoints"""
    
    def test_get_my_channel(self, authenticated_client):
        """Test GET /api/learn/channels/my"""
        response = authenticated_client.get(f"{BASE_URL}/api/learn/channels/my")
        assert response.status_code == 200
        data = response.json()
        
        # Admin user should have a channel
        if data:
            assert "id" in data
            assert "name" in data
            assert data["name"] == "MicLocker Pro Tips"
    
    def test_get_my_channel_unauthenticated(self, api_client):
        """Test GET /api/learn/channels/my without auth returns 401"""
        # Create a new session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/learn/channels/my")
        assert response.status_code == 401
    
    def test_get_subscriptions(self, authenticated_client):
        """Test GET /api/learn/subscriptions"""
        response = authenticated_client.get(f"{BASE_URL}/api/learn/subscriptions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_favorites(self, authenticated_client):
        """Test GET /api/learn/favorites"""
        response = authenticated_client.get(f"{BASE_URL}/api/learn/favorites")
        assert response.status_code == 200
        data = response.json()
        
        # Verify favorites structure
        assert "playlists" in data
        assert "videos" in data
        assert isinstance(data["playlists"], list)
        assert isinstance(data["videos"], list)
    
    def test_subscribe_to_channel_own_channel(self, authenticated_client):
        """Test subscribing to own channel should fail"""
        response = authenticated_client.post(f"{BASE_URL}/api/learn/channels/{TEST_CHANNEL_ID}/subscribe")
        # Should fail because user owns this channel
        assert response.status_code == 400
        assert "own channel" in response.json().get("detail", "").lower()


class TestLearnDataIntegrity:
    """Test data integrity and relationships"""
    
    def test_channel_playlist_relationship(self, api_client):
        """Test that playlists belong to correct channel"""
        # Get channel content
        response = api_client.get(f"{BASE_URL}/api/learn/channels/{TEST_CHANNEL_ID}/content")
        assert response.status_code == 200
        content = response.json()
        
        # Verify all playlists belong to this channel
        for playlist in content["playlists"]:
            assert playlist["channel_id"] == TEST_CHANNEL_ID
    
    def test_playlist_video_relationship(self, api_client):
        """Test that videos belong to correct playlist"""
        # Get videos in playlist
        response = api_client.get(f"{BASE_URL}/api/learn/videos?playlist_id={TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        videos = response.json()
        
        # Verify all videos belong to this playlist
        for video in videos:
            assert video["playlist_id"] == TEST_PLAYLIST_ID
    
    def test_video_count_matches(self, api_client):
        """Test that playlist video_count matches actual videos"""
        # Get playlist
        response = api_client.get(f"{BASE_URL}/api/learn/playlists/{TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        playlist = response.json()
        
        # Get videos in playlist
        response = api_client.get(f"{BASE_URL}/api/learn/videos?playlist_id={TEST_PLAYLIST_ID}")
        assert response.status_code == 200
        videos = response.json()
        
        # Video count should match
        assert playlist["video_count"] == len(videos)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
