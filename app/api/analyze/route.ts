import { NextRequest, NextResponse } from 'next/server';
import { NutritionData, FoodTrackEntry } from '../../types/nutrition';
import { insertFoodEntry } from '../../../utils/supabase';
import { HealthScoreCalculator } from '../../../utils/scoring/healthScoreCalculator';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

async function analyzeImage(imageBase64: string): Promise<NutritionData> {
  const requestBody = {
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this food image and provide nutritional information. Be concise and focus on key metrics.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    model: 'llama-3.2-90b-vision-preview',
    temperature: 0.1,
    max_tokens: 800,
    top_p: 1,
    stream: false,
    tools: [
      {
        type: 'function',
        function: {
          name: 'analyze_nutrition',
          description: 'Analyze nutritional content of food in image',
          parameters: {
            type: 'object',
            properties: {
              dish_name: {
                type: 'string',
                description: 'Name of the identified dish or food item'
              },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    estimated_amount: { type: 'string' },
                    allergen: { type: 'boolean' }
                  }
                }
              },
              macronutrients: {
                type: 'object',
                properties: {
                  calories: { type: 'number' },
                  protein: {
                    type: 'object',
                    properties: {
                      grams: { type: 'number' },
                      daily_value_percentage: { type: 'number' }
                    }
                  },
                  carbohydrates: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      fiber: { type: 'number' },
                      sugars: { type: 'number' }
                    }
                  },
                  fats: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      saturated: { type: 'number' },
                      unsaturated: { type: 'number' }
                    }
                  }
                }
              },
              micronutrients: {
                type: 'object',
                properties: {
                  vitamins: {
                    type: 'object',
                    properties: {
                      a: { type: 'number' },
                      c: { type: 'number' },
                      d: { type: 'number' },
                      b12: { type: 'number' }
                    }
                  },
                  minerals: {
                    type: 'object',
                    properties: {
                      calcium: { type: 'number' },
                      iron: { type: 'number' },
                      sodium: { type: 'number' },
                      potassium: { type: 'number' }
                    }
                  }
                }
              },
              health_metrics: {
                type: 'object',
                properties: {
                  health_score: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100
                  },
                  detailed_reasoning: {
                    type: 'string',
                    description: 'Brief explanation of health score'
                  },
                  dietary_flags: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            required: ['dish_name', 'ingredients', 'macronutrients']
          }
        }
      }
    ],
    tool_choice: 'auto'
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('API Response Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (response.status === 524) {
        throw new Error('The request timed out. The image might be too large or the service might be temporarily unavailable.');
      }

      throw new Error(`Failed to analyze image: ${response.status} ${response.statusText}`);
    }

    const result = JSON.parse(responseText);

    if (!result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      throw new Error('Invalid response format');
    }

    const parsedData = JSON.parse(
      result.choices[0].message.tool_calls[0].function.arguments
    );

    // Calculate custom health scores
    const healthScores = HealthScoreCalculator.calculateHealthScores(
      parsedData.macronutrients,
      parsedData.ingredients,
      parsedData.micronutrients
    );

    // Ensure health_metrics exists
    if (!parsedData.health_metrics) {
      parsedData.health_metrics = {};
    }

    // Update the nutrition data with custom scores
    parsedData.health_metrics.calculated_health_scores = {
      overall_score: Math.round(healthScores.overallScore * 100) / 100,
      component_scores: {
        macronutrient_score: Math.round(healthScores.macroScore * 100) / 100,
        vitamin_mineral_score: Math.round(healthScores.vitaminMineralScore * 100) / 100,
        calorie_score: Math.round(healthScores.calorieScore * 100) / 100,
        ingredient_score: Math.round(healthScores.ingredientsScore * 100) / 100
      },
      score_explanation: healthScores.scoreExplanation
    };

    return parsedData;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const userEmail = formData.get('userEmail') as string;

    if (!image || !userEmail) {
      return NextResponse.json(
        { error: 'Image and user email are required' },
        { status: 400 }
      );
    }

    // Log file information
    console.log('Received image:', {
      type: image.type,
      size: image.size,
      name: image.name
    });

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Analyze the image
    const nutritionData = await analyzeImage(base64Image);

    // Store in Supabase
    const foodEntry: Omit<FoodTrackEntry, 'id' | 'created_at'> = {
      user_email: userEmail,
      dish: nutritionData.dish_name,
      macro_nutrients: nutritionData.macronutrients,
      health_score: nutritionData.health_metrics.health_score
    };

    const savedEntry = await insertFoodEntry(foodEntry);

    return NextResponse.json({
      message: 'Analysis completed successfully',
      nutritionData,
      savedEntry
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}