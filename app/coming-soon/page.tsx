'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles, Phone } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Daily Calls Coming Soon
            </h1>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <p className="text-xl text-gray-600">
                Your future self is waiting to talk to you
              </p>
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
          </div>

          {/* Content */}
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <p className="text-lg text-gray-600">
              Imagine starting each day with a personal call from your future self - 
              someone who knows your goals, understands your challenges, and can guide you 
              toward making better choices today.
            </p>

            <div className="bg-blue-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">
                Daily Calls Feature
              </h2>
              <ul className="text-blue-700 space-y-2">
                <li>📞 Personal daily video calls from your future self</li>
                <li>🎯 Tailored advice based on your current habits</li>
                <li>💫 Motivation to make better choices today</li>
                <li>🌟 A unique way to visualize your future potential</li>
              </ul>
            </div>

            <div className="pt-6">
              <p className="text-gray-600 mb-8">
                While we prepare this feature, start building healthy habits by tracking your meals!
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
                <Link
                  href="/food-track"
                  className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                >
                  Start Tracking Your Meals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 