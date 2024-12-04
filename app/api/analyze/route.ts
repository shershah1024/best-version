import { NextRequest, NextResponse } from 'next/server';
import { NutritionData, FoodTrackEntry } from '../../types/nutrition';
import { insertFoodEntry } from '../../../utils/supabase';
import { HealthScoreCalculator } from '../../../utils/scoring/healthScoreCalculator';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

async function analyzeImage(imageBase64: string): Promise<NutritionData> {
  // Log image size for debugging
  console.log('Image base64 length:', imageBase64.length);

  const requestBody = {
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this food image and provide detailed nutritional information including:
            - Identify the dish name
            - List main ingredients
            - Calculate calories
            - Estimate protein, carbs, and fats
            - Include vitamin and mineral content if visible
            Please be specific with measurements and quantities.`
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
          description: 'Analyze nutritional content of food in image',
          parameters: {
            type: 'object',
            properties: {
              dish_name: {
                type: 'string',
                description: 'Name of the food item'
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
                      potassium: { type: 'number' },
                      sodium: { type: 'number' }
                    }
                  }
                }
              }
            },
            required: ['dish_name', 'ingredients', 'macronutrients']
          }
        }
      }
    ]
  };

  console.log('Making API request to Groq...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to analyze image: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (!result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      console.error('Invalid response structure:', result);
      throw new Error('Invalid response format');
    }

    const parsedData = JSON.parse(
      result.choices[0].message.tool_calls[0].function.arguments
    );
    console.log('Parsed nutrition data:', JSON.stringify(parsedData, null, 2));

    // Ensure we have the minimum required data
    if (!parsedData.dish_name || !parsedData.ingredients || !parsedData.macronutrients) {
      console.error('Missing required data in API response:', parsedData);
      throw new Error('Incomplete nutrition data from API');
    }

    // Ensure macronutrients have the required structure
    const macros = parsedData.macronutrients;
    if (!macros.calories || !macros.protein?.grams || !macros.carbohydrates?.total || !macros.fats?.total) {
      console.error('Incomplete macronutrient data:', macros);
      throw new Error('Incomplete macronutrient data from API');
    }

    // Calculate health scores
    const healthScores = HealthScoreCalculator.calculateHealthScores(
      parsedData.macronutrients,
      parsedData.ingredients,
      parsedData.micronutrients
    );

    return {
      dish_name: parsedData.dish_name,
      ingredients: parsedData.ingredients,
      macronutrients: {
        calories: macros.calories,
        protein: {
          grams: macros.protein.grams,
          daily_value_percentage: macros.protein.daily_value_percentage || 0
        },
        carbohydrates: {
          total: macros.carbohydrates.total,
          fiber: macros.carbohydrates.fiber || 0,
          sugars: macros.carbohydrates.sugars || 0
        },
        fats: {
          total: macros.fats.total,
          saturated: macros.fats.saturated || 0,
          unsaturated: macros.fats.unsaturated || 0
        }
      },
      micronutrients: parsedData.micronutrients || {},
      health_metrics: {
        health_score: healthScores.overallScore,
        detailed_reasoning: healthScores.scoreExplanation,
        calculated_health_scores: {
          overall_score: healthScores.overallScore,
          component_scores: {
            macronutrient_score: healthScores.macroScore,
            vitamin_mineral_score: healthScores.vitaminMineralScore,
            calorie_score: healthScores.calorieScore,
            ingredient_score: healthScores.ingredientsScore
          },
          score_explanation: healthScores.scoreExplanation
        }
      }
    };
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