export interface NutritionData {
  dish_name: string;
  macronutrients: {
    calories: number | null;
    protein?: {
      grams: number;
      daily_value_percentage?: number;
    };
    carbohydrates?: {
      total: number;
      fiber?: number;
      sugars?: number;
    };
    fats?: {
      total: number;
      saturated?: number;
      unsaturated?: number;
    };
  };
  health_metrics: {
    health_score: number;
    detailed_reasoning: string;
    calculated_health_scores?: {
      overall_score: number;
      component_scores: {
        macronutrient_score: number;
        vitamin_mineral_score: number;
        calorie_score: number;
        ingredient_score: number;
      };
      score_explanation: string;
    };
  };
}

export interface FoodTrackEntry {
  id?: number;
  created_at?: string;
  user_email: string;
  dish: string;
  macro_nutrients: {
    calories: number | null;
    protein?: {
      grams: number;
      daily_value_percentage?: number;
    };
    carbohydrates?: {
      total: number;
      fiber?: number;
      sugars?: number;
    };
    fats?: {
      total: number;
      saturated?: number;
      unsaturated?: number;
    };
  };
  health_score: number;
}