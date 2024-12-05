// app/api/video-script/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Type definitions for the request body
interface HealthData {
  date: string;
  combined_health_score: number;
  wellbeing: number;
  activity: number;
  sleep: number;
  food_score: number;
  recent_meals: {
    dish: string;
    health_score: number;
  }[];
  age: number;
  gender: string;
  talking_photo_id: string;
}

interface VideoGenerationResponse {
  supabase_url: string;
  error?: string;
  details?: any;
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
    const healthData: HealthData = await request.json();

    // 1. Generate script using Groq
    const messages = [
      {
        role: "system",
        content: `You are the future self of the user, and you are talking to him/her based on the data you have to motivate to eat better, sleep better and do more activities. Emphasize on how the choices he is making is making the future self healthier/non healthier, happier/not happier and so on. Also talk about how are are feeling as a result of the choices. Keep the response between 30-45 seconds when spoken.`
      },
      {
        role: "user",
        content: JSON.stringify(healthData)
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
            talking_photo_id: healthData.talking_photo_id
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