'use client';

import { useState, useEffect } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Activity, Heart, Moon, TrendingUp, TrendingDown, Minus, Utensils } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const USER_EMAIL = 'test@example.com';

interface WeekOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

interface SahhaData {
  date: string;
  wellbeing: number;
  activity: number;
  sleep: number;
}

interface HealthData {
  wellbeing: number;
  activity: number;
  sleep: number;
  food_score: number;
  trends: {
    wellbeing_trend: number;
    activity_trend: number;
    sleep_trend: number;
  };
}

export default function WeeklyVideoPage() {
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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

  const fetchWeeklyData = async (week: WeekOption) => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const weekStart = format(week.startDate, 'yyyy-MM-dd');

      // 1. Check for existing video
      const { data: video, error: videoError } = await supabase
        .from('future_videos')
        .select('video_url')
        .eq('week', weekStart)
        .eq('user_email', USER_EMAIL)
        .single();

      if (videoError && videoError.code !== 'PGRST116') {
        console.error('Error fetching video:', videoError);
      } else if (video?.video_url) {
        setVideoUrl(video.video_url);
      } else {
        setVideoUrl(null);
      }

      // 2. Fetch sahha data
      const { data: sahhaData, error: sahhaError } = await supabase
        .from('sahha_data')
        .select('date, wellbeing, activity, sleep')
        .eq('user_email', USER_EMAIL)
        .gte('date', format(week.startDate, 'yyyy-MM-dd'))
        .lte('date', format(week.endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (sahhaError) {
        throw new Error('Failed to fetch health data');
      }

      // 3. Fetch food data
      const { data: foodData, error: foodError } = await supabase
        .from('food_track')
        .select('health_score')
        .eq('user_email', USER_EMAIL)
        .gte('created_at', format(week.startDate, 'yyyy-MM-dd'))
        .lte('created_at', format(week.endDate, 'yyyy-MM-dd'));

      if (foodError) {
        throw new Error('Failed to fetch food data');
      }

      if (!sahhaData || sahhaData.length === 0) {
        setHealthData(null);
        return;
      }

      // Calculate weekly averages for sahha data
      const totals = sahhaData.reduce(
        (acc, day) => ({
          wellbeing: acc.wellbeing + (day.wellbeing || 0),
          activity: acc.activity + (day.activity || 0),
          sleep: acc.sleep + (day.sleep || 0)
        }),
        { wellbeing: 0, activity: 0, sleep: 0 }
      );

      const daysCount = sahhaData.length;
      
      // First calculate the averages of the decimal values
      const rawAverages = {
        wellbeing: totals.wellbeing / daysCount,
        activity: totals.activity / daysCount,
        sleep: totals.sleep / daysCount
      };

      // Calculate food score average
      const foodScore = foodData && foodData.length > 0
        ? Math.round(foodData.reduce((sum, entry) => sum + entry.health_score, 0) / foodData.length)
        : 0;

      // Then scale them to percentages
      const averages = {
        wellbeing: Math.round(rawAverages.wellbeing * 100),
        activity: Math.round(rawAverages.activity * 100),
        sleep: Math.round(rawAverages.sleep * 100)
      };

      // Calculate trends using the latest day's values
      const latestDay = sahhaData[0];
      const trends = {
        wellbeing_trend: Math.round(latestDay.wellbeing * 100) - averages.wellbeing,
        activity_trend: Math.round(latestDay.activity * 100) - averages.activity,
        sleep_trend: Math.round(latestDay.sleep * 100) - averages.sleep
      };

      setHealthData({
        ...averages,
        food_score: foodScore,
        trends
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-select current week on page load
  useEffect(() => {
    if (weekOptions.length > 0) {
      setSelectedWeek(weekOptions[0]);
      fetchWeeklyData(weekOptions[0]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Weekly Health Dashboard
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
                    fetchWeeklyData(week);
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
                Loading your weekly insights...
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
          {(healthData || videoUrl) && !isLoading && (
            <div className="mt-6 grid md:grid-cols-2 gap-8">
              {/* Video Section */}
              {videoUrl && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Message from Your Future Self</h2>
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
              )}

              {/* Health Data Section */}
              {healthData && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Health Summary</h2>
                  <div className="space-y-6">
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
                          <span className="font-medium">Food Score</span>
                        </div>
                        <span className={`text-xl font-bold ${getScoreColor(healthData.food_score)}`}>
                          {healthData.food_score}/100
                        </span>
                      </div>
                    </div>

                    {/* Trends Explanation */}
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                      <h3 className="font-medium text-gray-900 mb-2">Understanding Your Trends</h3>
                      <ul className="space-y-1">
                        <li className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span>Upward trend indicates improvement</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span>Downward trend suggests decline</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-gray-500" />
                          <span>Horizontal trend shows stability</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 