'use client';

import { useState, useEffect } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Activity, Heart, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const USER_EMAIL = 'test@example.com';

interface WeekOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

interface HealthData {
  combined_health_score: number;
  wellbeing: number;
  activity: number;
  sleep: number;
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

      // Get health data
      const healthDataResponse = await fetch(
        `/api/food-data?user_email=${USER_EMAIL}&start_date=${week.startDate.toISOString()}&end_date=${week.endDate.toISOString()}`
      );

      if (!healthDataResponse.ok) {
        throw new Error('Failed to fetch health data');
      }

      const weeklyHealthData = await healthDataResponse.json();
      setHealthData(weeklyHealthData);

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
      <div className="max-w-3xl mx-auto">
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
                Loading your health data...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Health Data Display */}
          {healthData && !isLoading && (
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          )}
        </div>
      </div>
    </div>
  );
} 