import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface FoodEntry {
  created_at: string;
  dish: string;
  health_score: number;
}

interface HealthEntry {
  date: string;
  wellbeing: number;
  activity: number;
  sleep: number;
}

// Photo IDs for different score ranges
const PHOTO_IDS = {
  HIGH: "1716f79923fe417e80dfd3cb07be01fb",    // Above 80%
  MEDIUM: "7e6fda74ad8740babb472763a3aaa5a2",  // 60-70%
  LOW: "3f1f324fa7314983bb9244c55b997189"      // Below 60%
};

function getPhotoIdForScore(score: number): string {
  if (score > 80) return PHOTO_IDS.HIGH;
  if (score >= 60 && score <= 70) return PHOTO_IDS.MEDIUM;
  return PHOTO_IDS.LOW;
}

export async function GET(request: Request) {
  try {
    // Get query params
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!userEmail || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'user_email, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch food data for the selected date range
    const { data: foodData, error: foodError } = await supabase
      .from('food_track')
      .select('created_at, dish, health_score')
      .eq('user_email', userEmail)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (foodError) {
      return NextResponse.json(
        { error: 'Failed to fetch food data', details: foodError },
        { status: 500 }
      );
    }

    // Fetch health data for the selected date range
    const { data: healthData, error: healthError } = await supabase
      .from('sahha_data')
      .select('date, wellbeing, activity, sleep')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (healthError) {
      return NextResponse.json(
        { error: 'Failed to fetch health data', details: healthError },
        { status: 500 }
      );
    }

    // Process food data
    const foodEntries: FoodEntry[] = foodData;
    const totalFoodScore = foodEntries.reduce((sum, entry) => sum + entry.health_score, 0);
    const weeklyFoodScore = foodEntries.length > 0 ? Math.round(totalFoodScore / foodEntries.length) : 0;

    // Process health data for the selected period
    const healthEntries: HealthEntry[] = healthData;
    const weeklyHealthStats = healthEntries.reduce(
      (acc, entry) => {
        acc.wellbeing += entry.wellbeing;
        acc.activity += entry.activity;
        acc.sleep += entry.sleep;
        acc.count += 1;
        return acc;
      },
      { wellbeing: 0, activity: 0, sleep: 0, count: 0 }
    );

    const weeklyAverages = {
      wellbeing: Math.round(weeklyHealthStats.count > 0 ? weeklyHealthStats.wellbeing / weeklyHealthStats.count : 0),
      activity: Math.round(weeklyHealthStats.count > 0 ? weeklyHealthStats.activity / weeklyHealthStats.count : 0),
      sleep: Math.round(weeklyHealthStats.count > 0 ? weeklyHealthStats.sleep / weeklyHealthStats.count : 0)
    };

    // Calculate trends
    const latestHealth = healthEntries[0] || { wellbeing: 0, activity: 0, sleep: 0 };
    const trends = {
      wellbeing: latestHealth.wellbeing - weeklyAverages.wellbeing,
      activity: latestHealth.activity - weeklyAverages.activity,
      sleep: latestHealth.sleep - weeklyAverages.sleep
    };

    // Calculate the combined score and select photo ID
    const combinedScore = Math.round(
      (weeklyAverages.wellbeing + weeklyAverages.activity + weeklyAverages.sleep + weeklyFoodScore) / 4
    );

    // Prepare the final data structure
    const scriptData = {
      date: new Date().toISOString().split('T')[0],
      combined_health_score: combinedScore,
      wellbeing: weeklyAverages.wellbeing,
      activity: weeklyAverages.activity,
      sleep: weeklyAverages.sleep,
      food_score: weeklyFoodScore,
      recent_meals: foodEntries.slice(0, 3).map(entry => ({
        dish: entry.dish,
        health_score: entry.health_score
      })),
      trends: {
        wellbeing_trend: trends.wellbeing,
        activity_trend: trends.activity,
        sleep_trend: trends.sleep
      },
      stats: {
        total_meals: foodEntries.length,
        days_tracked: weeklyHealthStats.count,
        best_meal: foodEntries.reduce((best, current) => 
          current.health_score > (best?.health_score || 0) ? current : best, 
          null as FoodEntry | null
        )
      },
      talking_photo_id: getPhotoIdForScore(combinedScore)
    };

    return NextResponse.json(scriptData);

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Example usage:
/*
GET /api/food-data?user_email=user@example.com&start_date=2024-03-01&end_date=2024-03-31

Response:
{
  "date": "2024-03-12",
  "combined_health_score": 75,        // Weekly average of all metrics
  "wellbeing": 80,                    // Weekly average wellbeing
  "activity": 70,                     // Weekly average activity
  "sleep": 75,                        // Weekly average sleep
  "food_score": 65,                   // Weekly average food score
  "recent_meals": [
    {
      "dish": "Grilled Salmon",
      "health_score": 85
    },
    {
      "dish": "Caesar Salad",
      "health_score": 70
    }
  ],
  "trends": {
    "wellbeing_trend": 5,             // Positive means improving
    "activity_trend": -2,             // Negative means declining
    "sleep_trend": 0                  // Zero means stable
  },
  "stats": {
    "total_meals": 15,                // Total meals tracked this week
    "days_tracked": 7,                // Number of days with health data
    "best_meal": {                    // Best meal of the week
      "dish": "Grilled Salmon",
      "health_score": 85
    }
  },
  "talking_photo_id": "1716f79923fe417e80dfd3cb07be01fb"  // Selected based on combined_health_score
}
*/ 