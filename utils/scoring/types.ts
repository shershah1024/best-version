export interface HealthScores {
  macroScore: number;
  vitaminMineralScore: number;
  calorieScore: number;
  ingredientsScore: number;
  overallScore: number;
  scoreExplanation: string;
}

export interface ScoringWeights {
  macros: number;
  vitamins_minerals: number;
  calories: number;
  ingredients: number;
}

export interface IdealMacros {
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fats: { min: number; max: number };
}