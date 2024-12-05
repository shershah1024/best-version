'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

export default function HomePage() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const videos = {
    unhealthy: "https://mbjkvwatoiryvmskgewn.supabase.co/storage/v1/object/public/course_audio/non-healthy.mp4?t=2024-12-05T02%3A54%3A21.854Z",
    healthy: "https://mbjkvwatoiryvmskgewn.supabase.co/storage/v1/object/public/course_audio/healthy_version.mp4?t=2024-12-05T02%3A54%3A52.934Z"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Video Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Unhealthy Future Self */}
          <div className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-red-500/10 pointer-events-none" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Star className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-600">
                  Struggling Future Self
                </h2>
              </div>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-xl overflow-hidden mb-6">
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={videos.unhealthy}
                  onPlay={() => setSelectedVideo('unhealthy')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-600 mb-6">
                This version of you is struggling with poor health choices and their consequences. But it's not too late to change this future.
              </p>
            </div>
          </div>

          {/* Healthy Future Self */}
          <div className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-green-500/10 pointer-events-none" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600">
                  Thriving Future Self
                </h2>
              </div>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-xl overflow-hidden mb-6">
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={videos.healthy}
                  onPlay={() => setSelectedVideo('healthy')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-600 mb-6">
                This version of you is thriving from consistent healthy choices and habits. This future is within your reach.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="mt-16">
          <div className="bg-white rounded-2xl shadow-xl p-12 max-w-none mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Your Future is in Your Hands
              </h2>
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
                Every choice you make today shapes your tomorrow. Your daily habits and decisions are building blocks for your future self. 
                Which version of your future would you like to create?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link
                  href="/coming-soon"
                  className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
                >
                  Talk to Your Future Self
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/food-track"
                  className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
                >
                  Track Your Journey
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {selectedVideo && (
          <div className="mt-12">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
              <p className="text-xl text-gray-700 text-center">
                {selectedVideo === 'healthy' 
                  ? "This could be you! Want to stay on this path? Let's check in on your progress and keep you moving forward."
                  : "Want to avoid this future? It's not too late to make better choices. Let's start making changes today."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}