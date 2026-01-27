/**
 * Top8Fans Component
 * 
 * Displays the top 8 most engaged fans on a user's profile.
 * Fans are ranked by engagement score (visits, time spent, interactions).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Crown, Star, Lock, Eye, EyeOff } from 'lucide-react';
import { profileVisitsAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import GoldMemberBadge from './GoldMemberBadge';

const Top8Fans = ({ profileId, isOwner = false }) => {
  const { isDark } = useTheme();
  const [topFans, setTopFans] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopFans = async () => {
      if (!profileId) return;
      
      try {
        setLoading(true);
        const response = await profileVisitsAPI.getTopFans(profileId);
        setTopFans(response.data.fans || []);
        setVisibility(response.data.visibility || 'public');
        setTotalVisitors(response.data.total_unique_visitors || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching top fans:', err);
        setError('Unable to load top fans');
      } finally {
        setLoading(false);
      }
    };

    fetchTopFans();
  }, [profileId]);

  // Don't render if hidden and not owner
  if (visibility === 'hidden' && !isOwner) {
    return null;
  }

  // Show private message if private and not owner
  if (visibility === 'private' && !isOwner) {
    return null;
  }

  if (loading) {
    return (
      <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top 8 Fans</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className={`w-full aspect-square rounded-xl ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  // Render rank badge - positioned at top-right corner, outside overflow container
  const RankBadge = ({ rank }) => {
    const colors = {
      1: 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30',
      2: 'bg-gray-300 text-gray-800 shadow-lg shadow-gray-300/30',
      3: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
    };
    
    return (
      <div className={`
        absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10
        ${colors[rank] || `${isDark ? 'bg-dark-200 text-gray-400' : 'bg-gray-300 text-gray-600'}`}
      `}>
        {rank}
      </div>
    );
  };

  return (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top 8 Fans</h3>
          {visibility === 'private' && isOwner && (
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
              <Lock className="w-3 h-3" /> Private
            </span>
          )}
        </div>
        {totalVisitors > 0 && (
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {totalVisitors} total visitor{totalVisitors !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Fans Grid */}
      {topFans.length > 0 ? (
        <div className="grid grid-cols-4 gap-4 pt-2 px-1">
          {topFans.map((fan) => (
            <Link
              key={fan.user_id}
              to={`/profile/${fan.user_id}`}
              className="group relative"
            >
              {/* Rank Badge - positioned outside the overflow container */}
              <RankBadge rank={fan.rank} />
              
              <div className={`
                relative rounded-xl overflow-hidden transition-all duration-200
                ${isDark 
                  ? 'bg-dark-300 hover:bg-dark-200' 
                  : 'bg-gray-100 hover:bg-gray-200'
                }
                group-hover:ring-2 group-hover:ring-primary/50
              `}>
                {/* Fan Avatar */}
                <div className="aspect-square">
                  {fan.profile_image ? (
                    <img
                      src={fan.profile_image}
                      alt={fan.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`
                      w-full h-full flex items-center justify-center
                      ${isDark ? 'bg-dark-300' : 'bg-gray-200'}
                    `}>
                      <span className="text-2xl font-bold text-primary">
                        {fan.username?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Gold Member / Founder Badge */}
                {(fan.is_gold_member || fan.is_founder) && (
                  <div className="absolute top-1 left-1">
                    <GoldMemberBadge isFounder={fan.is_founder} size="sm" />
                  </div>
                )}
              </div>
              
              {/* Username */}
              <p className={`
                mt-2 text-xs text-center truncate
                ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}
              `}>
                {fan.username}
              </p>
              
              {/* Engagement indicator (visits) */}
              <p className={`text-xs text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {fan.visit_count} visit{fan.visit_count !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
          
          {/* Empty slots */}
          {topFans.length < 8 && [...Array(8 - topFans.length)].map((_, i) => (
            <div key={`empty-${i}`} className="relative">
              <div className={`
                aspect-square rounded-xl border-2 border-dashed flex items-center justify-center
                ${isDark ? 'border-dark-300 bg-dark-500/50' : 'border-gray-200 bg-gray-50'}
              `}>
                <Users className={`w-6 h-6 ${isDark ? 'text-dark-300' : 'text-gray-300'}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`
          text-center py-8 rounded-xl border-2 border-dashed
          ${isDark ? 'border-dark-300 bg-dark-500/50' : 'border-gray-200 bg-gray-50'}
        `}>
          <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-dark-300' : 'text-gray-300'}`} />
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            No fans yet
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Fans appear based on profile visits and engagement
          </p>
        </div>
      )}
    </div>
  );
};

export default Top8Fans;
