export interface Ingredient {
  name: string;
  estimated_amount: string;
  allergen: boolean;
}

export interface ServingInfo {
  serving_size: string;
  servings_per_container: number;
}

export interface Macronutrients {
  calories: number;
  protein: {
    grams: number;
    daily_value_percentage: number;
  };
  carbohydrates: {
    total: number;
    fiber: number;
    sugars: number;
  };
  fats: {
    total: number;
    saturated: number;
    unsaturated: number;
  };
}

export interface Micronutrients {
  vitamins: {
    a: number;
    c: number;
    d: number;
    b12: number;
  };
  minerals: {
    calcium: number;
    iron: number;
    sodium: number;
    potassium: number;
  };
}

export interface HealthMetrics {
  health_score: number;
  detailed_reasoning: string;
  dietary_flags: string[];
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
}

export interface NutritionData {
  dish_name: string;
  ingredients: Ingredient[];
  serving_info?: ServingInfo;
  macronutrients: Macronutrients;
  micronutrients?: Micronutrients;
  health_metrics: HealthMetrics;
}

export interface FoodTrackEntry {
  id?: number;
  created_at?: string;
  user_email: string;
  dish: string;
  macro_nutrients: Macronutrients;
  health_score: number;
}