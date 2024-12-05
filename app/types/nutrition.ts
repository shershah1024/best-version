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
    };
    fats?: {
      total: number;
      saturated?: number;
    };
  };
  health_metrics: {
    health_score: number;
    detailed_reasoning: string;
  };
}