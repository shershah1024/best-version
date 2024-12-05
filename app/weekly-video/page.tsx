'use client';

import { useState } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { Activity, Heart, Utensils, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const USER_EMAIL = 'test@example.com';

interface WeekOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

interface FutureVideo {
  id?: number;
  created_at?: string;
  week: string;
  video_url: string;
  user_email: string;
}

interface HealthData {
  combined_health_score: number;
  wellbeing: number;
  activity: number;
  sleep: number;
  food_score: number;
  recent_meals: Array<{
    dish: string;
    health_score: number;
  }>;
  trends: {
    wellbeing_trend: number;
    activity_trend: number;
    sleep_trend: number;
  };
}

export default function WeeklyVideoPage() {
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate last 4 weeks as options
  const weekOptions: WeekOption[] = Array.from({ length: 4 }).map((_, index) => {
    const currentDate = subWeeks(new Date(), index);
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return {
      label: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
      startDate: start,
      endDate: end
    };
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const generateVideo = async (week: WeekOption) => {
    try {
      setIsLoading(true);
      setError(null);
      setVideoUrl(null);
      setHealthData(null);

      // Initialize Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const weekStart = format(week.startDate, 'yyyy-MM-dd');

      // 1. Get the health data for the selected week
      const healthDataResponse = await fetch(
        `/api/food-data?user_email=${USER_EMAIL}&start_date=${week.startDate.toISOString()}&end_date=${week.endDate.toISOString()}`
      );

      if (!healthDataResponse.ok) {
        throw new Error('Failed to fetch health data');
      }

      const weeklyHealthData = await healthDataResponse.json();
      setHealthData(weeklyHealthData);

      // 2. Check for existing video
      let existingVideo: FutureVideo | null = null;
      try {
        const { data: videos } = await supabase
          .from('future_videos')
          .select('*')
          .eq('week', weekStart)
          .eq('user_email', USER_EMAIL)
          .limit(1)
          .single();
        
        existingVideo = videos;
      } catch (error) {
        console.log('No existing video found or error fetching:', error);
        // Continue with video generation if no video exists or there was an error
      }

      if (existingVideo?.video_url) {
        setVideoUrl(existingVideo.video_url);
        return;
      }

      // 3. Generate new video if none exists
      const videoResponse = await fetch('/api/video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...weeklyHealthData,
          user_email: USER_EMAIL
        })
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to generate video');
      }

      const videoData = await videoResponse.json();

      // 4. Save the video URL to the future_videos table
      try {
        await supabase
          .from('future_videos')
          .insert([
            {
              week: weekStart,
              video_url: videoData.supabase_url,
              user_email: USER_EMAIL
            }
          ]);
      } catch (error) {
        console.error('Failed to save video to database:', error);
        // Continue since we still have the video URL
      }

      setVideoUrl(videoData.supabase_url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Weekly Health Video Generator
          </h1>

          {/* Week Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Week
            </label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {weekOptions.map((week, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedWeek(week);
                    generateVideo(week);
                  }}
                  className={`p-4 text-sm border rounded-lg transition-colors ${
                    selectedWeek === week
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={isLoading}
                >
                  {week.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">
                {videoUrl ? 'Fetching your weekly health video...' : 'Generating your weekly health video...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Content Display */}
          {videoUrl && healthData && !isLoading && (
            <div className="mt-6 grid md:grid-cols-2 gap-8">
              {/* Video Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Weekly Health Video</h2>
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full object-contain"
                    src={videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Health Data Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Health Summary</h2>
                <div className="space-y-6">
                  {/* Overall Score */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 font-medium">Overall Health Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(healthData.combined_health_score)}`}>
                        {healthData.combined_health_score}/100
                      </span>
                    </div>
                  </div>

                  {/* Health Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        <span className="font-medium">Wellbeing</span>
                        {getTrendIcon(healthData.trends.wellbeing_trend)}
                      </div>
                      <span className={`text-xl font-bold ${getScoreColor(healthData.wellbeing)}`}>
                        {healthData.wellbeing}/100
                      </span>
                    </div>

                    <div className="bg-white rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Activity</span>
                        {getTrendIcon(healthData.trends.activity_trend)}
                      </div>
                      <span className={`text-xl font-bold ${getScoreColor(healthData.activity)}`}>
                        {healthData.activity}/100
                      </span>
                    </div>

                    <div className="bg-white rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-5 h-5 text-purple-500" />
                        <span className="font-medium">Sleep</span>
                        {getTrendIcon(healthData.trends.sleep_trend)}
                      </div>
                      <span className={`text-xl font-bold ${getScoreColor(healthData.sleep)}`}>
                        {healthData.sleep}/100
                      </span>
                    </div>

                    <div className="bg-white rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className="w-5 h-5 text-orange-500" />
                        <span className="font-medium">Nutrition</span>
                      </div>
                      <span className={`text-xl font-bold ${getScoreColor(healthData.food_score)}`}>
                        {healthData.food_score}/100
                      </span>
                    </div>
                  </div>

                  {/* Recent Meals */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Meals</h3>
                    <div className="space-y-2">
                      {healthData.recent_meals.map((meal, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg border p-3">
                          <span className="text-gray-600">{meal.dish}</span>
                          <span className={`font-medium ${getScoreColor(meal.health_score)}`}>
                            {meal.health_score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 