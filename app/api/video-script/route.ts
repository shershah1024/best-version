// app/api/video-script/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Photo IDs for different score ranges
const PHOTO_IDS = {
  HIGH: "1716f79923fe417e80dfd3cb07be01fb",    // Above 80%
  MEDIUM: "7e6fda74ad8740babb472763a3aaa5a2",  // 70-80%
  LOW: "3f1f324fa7314983bb9244c55b997189"      // Below 70%
};

// Type definitions for the request body
interface Meal {
  dish: string;
  health_score: number;
}

interface HealthDataItem {
  wellbeing: number;
  activity: number;
  sleep: number;
}

interface HealthAverages extends HealthDataItem {
  count: number;
}

interface VideoGenerationResponse {
  supabase_url: string;
  error?: string;
  details?: any;
}

interface RequestData {
  start_date: string;
  end_date: string;
  user_email: string;
}

function getPhotoIdForScores(wellbeing: number, activity: number, sleep: number): string {
  // Calculate average of sahha scores
  const avgScore = (wellbeing + activity + sleep) / 3;
  
  if (avgScore >= 80) return PHOTO_IDS.HIGH;
  if (avgScore >= 70) return PHOTO_IDS.MEDIUM;
  return PHOTO_IDS.LOW;
}

export async function POST(request: Request) {
  try {
    // Check for required API keys
    const groqApiKey = process.env.GROQ_API_KEY;
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!groqApiKey || !heygenApiKey || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing required API keys' },
        { status: 500 }
      );
    }

    // Parse the request body
    const requestData: RequestData = await request.json();
    const { start_date, end_date, user_email } = requestData;

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch health data
    const { data: healthData, error: healthError } = await supabase
      .from('sahha_data')
      .select('wellbeing,activity,sleep')
      .eq('user_email', user_email)
      .gte('date', start_date)
      .lte('date', end_date);

    if (healthError) {
      return NextResponse.json(
        { error: 'Failed to fetch health data', details: healthError },
        { status: 500 }
      );
    }

    // 2. Fetch food data
    const { data: foodData, error: foodError } = await supabase
      .from('food_track')
      .select('dish,health_score')
      .eq('user_email', user_email)
      .gte('created_at', start_date)
      .lte('created_at', end_date);

    if (foodError) {
      return NextResponse.json(
        { error: 'Failed to fetch food data', details: foodError },
        { status: 500 }
      );
    }

    // Calculate health averages
    const healthAverages = healthData.reduce<HealthAverages>(
      (acc, item) => ({
        wellbeing: acc.wellbeing + (item.wellbeing || 0),
        activity: acc.activity + (item.activity || 0),
        sleep: acc.sleep + (item.sleep || 0),
        count: acc.count + 1
      }),
      { wellbeing: 0, activity: 0, sleep: 0, count: 0 }
    );

    const averages = {
      wellbeing: Math.round((healthAverages.wellbeing / healthAverages.count) * 100),
      activity: Math.round((healthAverages.activity / healthAverages.count) * 100),
      sleep: Math.round((healthAverages.sleep / healthAverages.count) * 100)
    };

    // Calculate food score
    const foodScore = foodData.length > 0
      ? Math.round(foodData.reduce((sum, item) => sum + item.health_score, 0) / foodData.length)
      : 0;

    // Get recent meals
    const recentMeals = foodData.slice(0, 3);

    // Select photo ID based on health scores
    const avgScore = (averages.wellbeing + averages.activity + averages.sleep) / 3;
    let talkingPhotoId;
    if (avgScore >= 80) {
      talkingPhotoId = "1716f79923fe417e80dfd3cb07be01fb"; // Best version
    } else if (avgScore >= 70) {
      talkingPhotoId = "7e6fda74ad8740babb472763a3aaa5a2"; // Medium version
    } else {
      talkingPhotoId = "3f1f324fa7314983bb9244c55b997189"; // Needs improvement
    }

    // Generate script using Groq
    const messages = [
      {
        role: "system",
        content: `You are the future self of the user, and you are talking to them based on their health data to motivate better habits. Focus on:
- Wellbeing score: ${averages.wellbeing}/100
- Activity score: ${averages.activity}/100
- Sleep score: ${averages.sleep}/100
- Food score: ${foodScore}/100

Recent meals:
${recentMeals.map(meal => `- ${meal.dish} (Health Score: ${meal.health_score}/100)`).join('\n')}

Emphasize how their current choices are impacting their future self's health and happiness. If scores are low (below 70), express concern and urgency for change. If scores are medium (70-80), acknowledge progress but encourage improvement. If scores are high (above 80), express pride and encourage maintaining these excellent habits.

When discussing food choices:
- For healthy meals (score > 80): Express satisfaction and encourage maintaining these choices
- For moderate meals (score 60-80): Acknowledge the balance but suggest small improvements
- For less healthy meals (score < 60): Gently suggest healthier alternatives

Keep the response between 30-45 seconds when spoken.`
      }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        messages,
        model: "llama-3.2-90b-vision-preview",
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      return NextResponse.json(
        { error: 'Groq API request failed', details: errorData },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json();
    const script = groqData.choices[0].message.content;

    // 2. Generate video using HeyGen
    const generateResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: "46d173f7d7d34ab186600619ba36e10a",
            emotion: "Serious"
          },
          background: {
            type: "color",
            value: "#FAFAFA"
          }
        }]
      })
    });

    if (!generateResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to generate video' },
        { status: generateResponse.status }
      );
    }

    const { data: { video_id } } = await generateResponse.json();

    // 3. Poll for video status with increased timeout
    let videoUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
        {
          headers: {
            'X-Api-Key': heygenApiKey,
            'accept': 'application/json'
          }
        }
      );

      if (!statusResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to check video status' },
          { status: statusResponse.status }
        );
      }

      const status = await statusResponse.json();
      console.log(`Video generation status: ${status.data.status} (Attempt ${attempts + 1}/${maxAttempts})`);
      
      if (status.data.status === 'completed') {
        videoUrl = status.data.video_url;
        break;
      } else if (status.data.status === 'failed') {
        return NextResponse.json(
          { error: 'Video generation failed' },
          { status: 500 }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video generation timed out' },
        { status: 504 }
      );
    }

    // 4. Download video from HeyGen
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download video from HeyGen' },
        { status: videoResponse.status }
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const timestamp = Date.now();
    const filename = `video_${timestamp}.mp4`;

    // 5. Upload to Supabase Storage
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });

    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('course_audio')
      .upload(filename, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600'
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload to Supabase', details: uploadError },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('course_audio')
      .getPublicUrl(filename);

    return NextResponse.json({
      supabase_url: publicUrl,
      script: script
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Example usage from frontend:
/*
const response = await fetch('/api/video-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    date: "2024-03-05",
    combined_health_score: 75,
    wellbeing: 80,
    activity: 70,
    sleep: 75,
    food_score: 65,
    recent_meals: [
      { dish: "Grilled Salmon", health_score: 85 },
      { dish: "Caesar Salad", health_score: 70 }
    ],
    age: 30,
    gender: "female",
    talking_photo_id: "1716f79923fe417e80dfd3cb07be01fb"
  })
});

const data = await response.json();
console.log(data.supabase_url);  // URL of the uploaded video
console.log(data.script);        // Generated script text
*/