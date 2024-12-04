import { NextRequest, NextResponse } from 'next/server';
import { NutritionData, FoodTrackEntry } from '../../types/nutrition';
import { insertFoodEntry } from '../../../utils/supabase';
import { HealthScoreCalculator } from '../../../utils/scoring/healthScoreCalculator';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

async function analyzeImage(imageBase64: string): Promise<NutritionData> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please provide a detailed nutritional analysis of this food.'
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
      max_tokens: 1024,
      top_p: 1,
      stream: false,
      tools: [
        {
          type: 'function',
          function: {
            name: 'analyze_nutrition',
            description: 'Perform comprehensive nutritional analysis of food in an image',
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
                health_metrics: {
                  type: 'object',
                  properties: {
                    health_score: { type: 'number' },
                    detailed_reasoning: { type: 'string' }
                  }
                }
              },
              required: ['dish_name', 'ingredients', 'macronutrients', 'health_metrics']
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to analyze image');
  }

  const result = await response.json();
  if (!result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
    throw new Error('Invalid response format');
  }

  try {
    const parsedData = JSON.parse(
      result.choices[0].message.tool_calls[0].function.arguments
    );

    // Ensure all required fields exist with defaults
    return {
      dish_name: parsedData.dish_name || 'Unknown Dish',
      ingredients: parsedData.ingredients || [],
      macronutrients: {
        calories: parsedData.macronutrients?.calories || 0,
        protein: {
          grams: parsedData.macronutrients?.protein?.grams || 0,
          daily_value_percentage: parsedData.macronutrients?.protein?.daily_value_percentage || 0
        },
        carbohydrates: {
          total: parsedData.macronutrients?.carbohydrates?.total || 0,
          fiber: parsedData.macronutrients?.carbohydrates?.fiber || 0,
          sugars: parsedData.macronutrients?.carbohydrates?.sugars || 0
        },
        fats: {
          total: parsedData.macronutrients?.fats?.total || 0,
          saturated: parsedData.macronutrients?.fats?.saturated || 0,
          unsaturated: parsedData.macronutrients?.fats?.unsaturated || 0
        }
      },
      health_metrics: {
        health_score: parsedData.health_metrics?.health_score || 0,
        detailed_reasoning: parsedData.health_metrics?.detailed_reasoning || 'No analysis available'
      }
    };
  } catch (error) {
    console.error('Error parsing API response:', error);
    throw new Error('Failed to parse nutrition data');
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
      { error: 'Failed to process image' },
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