'use client';

import { useState } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

interface WeekOption {
  label: string;
  startDate: Date;
  endDate: Date;
}

export default function WeeklyVideoPage() {
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const generateVideo = async (week: WeekOption) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get the health data for the selected week
      const healthDataResponse = await fetch(
        `/api/food-data?user_email=user@example.com&start_date=${week.startDate.toISOString()}&end_date=${week.endDate.toISOString()}`
      );

      if (!healthDataResponse.ok) {
        throw new Error('Failed to fetch health data');
      }

      const healthData = await healthDataResponse.json();

      // 2. Generate the video using the health data
      const videoResponse = await fetch('/api/video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(healthData)
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to generate video');
      }

      const videoData = await videoResponse.json();
      setVideoUrl(videoData.supabase_url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
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
              <p className="mt-2 text-gray-600">Generating your weekly health video...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Video Display */}
          {videoUrl && !isLoading && (
            <div className="mt-6">
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
          )}
        </div>
      </div>
    </div>
  );
} 