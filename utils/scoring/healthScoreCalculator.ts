import { Macronutrients, Micronutrients, Ingredient } from '../../app/types/nutrition';
import { HealthScores, ScoringWeights, IdealMacros } from './types';

export class HealthScoreCalculator {
  private static readonly WEIGHTS: ScoringWeights = {
    macros: 0.35,
    vitamins_minerals: 0.25,
    calories: 0.20,
    ingredients: 0.20
  };

  private static readonly IDEAL_MACROS: IdealMacros = {
    protein: { min: 20, max: 35 },
    carbs: { min: 45, max: 65 },
    fats: { min: 20, max: 35 }
  };

  private static calculateMacroScore(macros: Macronutrients): [number, string] {
    try {
      // Calculate total calories from each macro
      const proteinCals = macros.protein.grams * 4;
      const carbCals = macros.carbohydrates.total * 4;
      const fatCals = macros.fats.total * 9;
      const totalCals = macros.calories || (proteinCals + carbCals + fatCals);

      if (totalCals === 0) {
        return [0, "Could not calculate macro ratios - no calorie information"];
      }

      // Calculate percentages
      const proteinPct = (proteinCals / totalCals) * 100;
      const carbPct = (carbCals / totalCals) * 100;
      const fatPct = (fatCals / totalCals) * 100;

      // Score each macro based on ideal ranges
      const proteinScore = (this.IDEAL_MACROS.protein.min <= proteinPct && 
                           proteinPct <= this.IDEAL_MACROS.protein.max) ? 100 : 50;
      const carbScore = (this.IDEAL_MACROS.carbs.min <= carbPct && 
                        carbPct <= this.IDEAL_MACROS.carbs.max) ? 100 : 50;
      const fatScore = (this.IDEAL_MACROS.fats.min <= fatPct && 
                       fatPct <= this.IDEAL_MACROS.fats.max) ? 100 : 50;

      const score = (proteinScore + carbScore + fatScore) / 3;
      const explanation = `Macro distribution - Protein: ${proteinPct.toFixed(1)}%, Carbs: ${carbPct.toFixed(1)}%, Fats: ${fatPct.toFixed(1)}%`;

      return [score, explanation];
    } catch {
      return [0, "Error calculating macro score - missing or invalid data"];
    }
  }

  private static calculateVitaminMineralScore(micronutrients?: Micronutrients): [number, string] {
    try {
      if (!micronutrients) {
        return [0, "No vitamin/mineral data available"];
      }

      const vitamins = micronutrients.vitamins;
      const minerals = micronutrients.minerals;

      // Reference daily values
      const dv = {
        a: 900, c: 90, d: 20, b12: 2.4,  // vitamins
        calcium: 1000, iron: 18, potassium: 3500, sodium: 2300  // minerals
      };

      const scores: number[] = [];
      const metNutrients: string[] = [];

      // Score vitamins
      Object.entries(vitamins).forEach(([vit, amount]) => {
        if (amount && amount > 0) {
          const score = Math.min(100, (amount / (dv as any)[vit]) * 100);
          scores.push(score);
          if (score >= 50) {
            metNutrients.push(`Vitamin ${vit.toUpperCase()}`);
          }
        }
      });

      // Score minerals
      Object.entries(minerals).forEach(([min_, amount]) => {
        if (amount && amount > 0) {
          let score;
          if (min_ === 'sodium') {
            score = Math.max(0, 100 - (amount / dv[min_]) * 100);
          } else {
            score = Math.min(100, (amount / (dv as any)[min_]) * 100);
          }
          scores.push(score);
          if (score >= 50) {
            metNutrients.push(min_.charAt(0).toUpperCase() + min_.slice(1));
          }
        }
      });

      if (scores.length === 0) {
        return [0, "No vitamin/mineral data available"];
      }

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const explanation = metNutrients.length > 0 
        ? `Good sources of: ${metNutrients.join(', ')}` 
        : "Limited vitamin/mineral content";

      return [avgScore, explanation];
    } catch (e) {
      return [0, `Error calculating vitamin/mineral score: ${e}`];
    }
  }

  private static calculateCalorieScore(macros: Macronutrients): [number, string] {
    try {
      const calories = macros.calories;
      if (!calories || calories <= 0) {
        return [0, "No calorie information available"];
      }

      let score: number;
      let explanation: string;

      if (calories <= 200) {
        score = 90;
        explanation = "Low calorie meal";
      } else if (calories <= 500) {
        score = 100;
        explanation = "Moderate calorie meal";
      } else if (calories <= 800) {
        score = 80;
        explanation = "Moderately high calorie meal";
      } else {
        score = Math.max(0, 100 - ((calories - 800) / 100));
        explanation = "High calorie meal";
      }

      return [score, explanation];
    } catch {
      return [0, "Error calculating calorie score"];
    }
  }

  private static calculateIngredientsScore(ingredients: Ingredient[]): [number, string] {
    try {
      if (!ingredients || ingredients.length === 0) {
        return [0, "No ingredient information available"];
      }

      const beneficial = new Set(['fresh', 'whole', 'organic', 'lean', 'raw', 'natural']);
      const problematic = new Set(['processed', 'artificial', 'fried', 'refined', 'sweetened']);

      let totalScore = 0;
      const goodIngredients: string[] = [];
      const badIngredients: string[] = [];

      ingredients.forEach(ingredient => {
        const name = ingredient.name.toLowerCase();

        // Score based on keywords
        const goodPoints = Array.from(beneficial)
          .reduce((sum, keyword) => sum + (name.includes(keyword) ? 10 : 0), 0);
        const badPoints = Array.from(problematic)
          .reduce((sum, keyword) => sum + (name.includes(keyword) ? 10 : 0), 0);

        const ingredientScore = 70 + goodPoints - badPoints;  // Base score of 70
        totalScore += ingredientScore;

        if (goodPoints > badPoints) {
          goodIngredients.push(ingredient.name);
        } else if (badPoints > 0) {
          badIngredients.push(ingredient.name);
        }
      });

      const avgScore = Math.min(100, totalScore / ingredients.length);
      let explanation = "";

      if (goodIngredients.length > 0) {
        explanation = `Healthy ingredients: ${goodIngredients.slice(0, 3).join(', ')}`;
        if (badIngredients.length > 0) {
          explanation += `. Consider: ${badIngredients.slice(0, 2).join(', ')}`;
        }
      } else {
        explanation = "Limited ingredient quality information";
      }

      return [avgScore, explanation];
    } catch (e) {
      return [0, `Error calculating ingredients score: ${e}`];
    }
  }

  public static calculateHealthScores(
    macros: Macronutrients,
    ingredients: Ingredient[],
    micronutrients?: Micronutrients
  ): HealthScores {
    const [macroScore, macroExp] = this.calculateMacroScore(macros);
    const [vitaminScore, vitaminExp] = this.calculateVitaminMineralScore(micronutrients);
    const [calorieScore, calorieExp] = this.calculateCalorieScore(macros);
    const [ingredientScore, ingredientExp] = this.calculateIngredientsScore(ingredients);

    const overallScore = (
      macroScore * this.WEIGHTS.macros +
      vitaminScore * this.WEIGHTS.vitamins_minerals +
      calorieScore * this.WEIGHTS.calories +
      ingredientScore * this.WEIGHTS.ingredients
    );

    const explanations = [
      `• Macronutrients (${macroScore.toFixed(0)}/100): ${macroExp}`,
      `• Vitamins/Minerals (${vitaminScore.toFixed(0)}/100): ${vitaminExp}`,
      `• Calories (${calorieScore.toFixed(0)}/100): ${calorieExp}`,
      `• Ingredients (${ingredientScore.toFixed(0)}/100): ${ingredientExp}`
    ];

    return {
      macroScore,
      vitaminMineralScore: vitaminScore,
      calorieScore,
      ingredientsScore: ingredientScore,
      overallScore,
      scoreExplanation: explanations.join('\n')
    };
  }
}