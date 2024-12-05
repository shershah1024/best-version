'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const videos = {
    unhealthy: "https://mbjkvwatoiryvmskgewn.supabase.co/storage/v1/object/public/course_audio/non-healthy.mp4?t=2024-12-05T02%3A54%3A21.854Z",
    healthy: "https://mbjkvwatoiryvmskgewn.supabase.co/storage/v1/object/public/course_audio/healthy_version.mp4?t=2024-12-05T02%3A54%3A52.934Z"
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Who Would You Like to Talk to Today?
          </h1>
          <p className="text-xl text-gray-600">
            Your future self is shaped by your choices today. Which version would you prefer to meet?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Unhealthy Future Self */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-red-600 mb-4">
                Struggling Future Self
              </h2>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden mb-4">
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={videos.unhealthy}
                  onPlay={() => setSelectedVideo('unhealthy')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-600">
                This version of you is struggling with poor health choices and their consequences.
              </p>
            </div>
          </div>

          {/* Healthy Future Self */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-green-600 mb-4">
                Thriving Future Self
              </h2>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden mb-4">
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={videos.healthy}
                  onPlay={() => setSelectedVideo('healthy')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-600">
                This version of you is thriving from consistent healthy choices and habits.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-6">
          <p className="text-xl text-gray-700">
            It depends on you. Your daily choices shape which future becomes reality.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/weekly-video"
              className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Talk to Your Future Self Now →
            </Link>
            <Link
              href="/food-track"
              className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Track Your Meals →
            </Link>
          </div>
        </div>

        {selectedVideo && (
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-600">
              {selectedVideo === 'healthy' 
                ? "This could be you! Want to stay on this path? Let's check in on your progress."
                : "Want to avoid this future? It's not too late to make better choices."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}