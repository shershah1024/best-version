import { Macronutrients, Micronutrients, Ingredient } from '../../app/types/nutrition';
import { HealthScores, ScoringWeights, IdealMacros } from './types';

export class HealthScoreCalculator {
  private static readonly BASE_WEIGHTS = {
    macros: 0.35,
    vitamins_minerals: 0.25,
    calories: 0.20,
    ingredients: 0.20
  };

  private static calculateMacroScore(macros: Macronutrients): [number, string] {
    try {
      // Calculate total calories from each macro if available
      const proteinCals = macros.protein?.grams ? macros.protein.grams * 4 : 0;
      const carbCals = macros.carbohydrates?.total ? macros.carbohydrates.total * 4 : 0;
      const fatCals = macros.fats?.total ? macros.fats.total * 9 : 0;
      const totalCals = macros.calories || (proteinCals + carbCals + fatCals);

      if (totalCals === 0) {
        return [0, "No calorie information available"];
      }

      let scores: number[] = [];
      let explanations: string[] = [];

      // Only calculate percentages and scores for available macros
      if (macros.protein?.grams) {
        const proteinPct = (proteinCals / totalCals) * 100;
        const proteinScore = (proteinPct >= 10 && proteinPct <= 35) ? 100 : 50;
        scores.push(proteinScore);
        explanations.push(`Protein: ${proteinPct.toFixed(1)}%`);
      }

      if (macros.carbohydrates?.total) {
        const carbPct = (carbCals / totalCals) * 100;
        const carbScore = (carbPct >= 45 && carbPct <= 65) ? 100 : 50;
        scores.push(carbScore);
        explanations.push(`Carbs: ${carbPct.toFixed(1)}%`);
      }

      if (macros.fats?.total) {
        const fatPct = (fatCals / totalCals) * 100;
        const fatScore = (fatPct >= 20 && fatPct <= 35) ? 100 : 50;
        scores.push(fatScore);
        explanations.push(`Fats: ${fatPct.toFixed(1)}%`);
      }

      if (scores.length === 0) {
        return [0, "No macronutrient data available"];
      }

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      return [avgScore, `Macro distribution - ${explanations.join(', ')}`];
    } catch {
      return [0, "Error calculating macro score"];
    }
  }

  private static calculateVitaminMineralScore(micronutrients?: Micronutrients): [number, string] {
    if (!micronutrients) {
      return [0, "No vitamin/mineral data available"];
    }

    try {
      const dv = {
        a: 900, c: 90, d: 20, b12: 2.4,
        calcium: 1000, iron: 18, potassium: 3500, sodium: 2300
      };

      const scores: number[] = [];
      const metNutrients: string[] = [];

      // Only score available vitamins
      if (micronutrients.vitamins) {
        Object.entries(micronutrients.vitamins).forEach(([vit, amount]) => {
          if (amount != null && amount > 0) {
            const score = Math.min(100, (amount / (dv as any)[vit]) * 100);
            scores.push(score);
            if (score >= 50) {
              metNutrients.push(`Vitamin ${vit.toUpperCase()}`);
            }
          }
        });
      }

      // Only score available minerals
      if (micronutrients.minerals) {
        Object.entries(micronutrients.minerals).forEach(([min_, amount]) => {
          if (amount != null && amount > 0) {
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
      }

      if (scores.length === 0) {
        return [0, "No vitamin/mineral data available"];
      }

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const explanation = metNutrients.length > 0 
        ? `Good sources of: ${metNutrients.join(', ')}` 
        : "Limited vitamin/mineral content";

      return [avgScore, explanation];
    } catch (e) {
      return [0, `Error calculating vitamin/mineral score`];
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
    if (!ingredients || ingredients.length === 0) {
      return [0, "No ingredient information available"];
    }

    try {
      const beneficial = new Set(['fresh', 'whole', 'organic', 'lean', 'raw', 'natural']);
      const problematic = new Set(['processed', 'artificial', 'fried', 'refined', 'sweetened']);

      let totalScore = 0;
      const goodIngredients: string[] = [];
      const badIngredients: string[] = [];

      ingredients.forEach(ingredient => {
        if (!ingredient.name) return;
        
        const name = ingredient.name.toLowerCase();
        const goodPoints = Array.from(beneficial)
          .reduce((sum, keyword) => sum + (name.includes(keyword) ? 10 : 0), 0);
        const badPoints = Array.from(problematic)
          .reduce((sum, keyword) => sum + (name.includes(keyword) ? 10 : 0), 0);

        const ingredientScore = 70 + goodPoints - badPoints;
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
      return [0, `Error calculating ingredients score`];
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

    // Calculate weights based on available data
    let weights = { ...this.BASE_WEIGHTS };
    let totalWeight = 0;

    if (macroScore > 0) totalWeight += weights.macros;
    else weights.macros = 0;

    if (vitaminScore > 0) totalWeight += weights.vitamins_minerals;
    else weights.vitamins_minerals = 0;

    if (calorieScore > 0) totalWeight += weights.calories;
    else weights.calories = 0;

    if (ingredientScore > 0) totalWeight += weights.ingredients;
    else weights.ingredients = 0;

    // Normalize weights if we have any data
    if (totalWeight > 0) {
      const factor = 1 / totalWeight;
      weights = {
        macros: weights.macros * factor,
        vitamins_minerals: weights.vitamins_minerals * factor,
        calories: weights.calories * factor,
        ingredients: weights.ingredients * factor
      };
    }

    // Calculate overall score using normalized weights
    const overallScore = (
      macroScore * weights.macros +
      vitaminScore * weights.vitamins_minerals +
      calorieScore * weights.calories +
      ingredientScore * weights.ingredients
    );

    const explanations = [
      macroScore > 0 ? `• Macronutrients (${macroScore.toFixed(0)}/100): ${macroExp}` : null,
      vitaminScore > 0 ? `• Vitamins/Minerals (${vitaminScore.toFixed(0)}/100): ${vitaminExp}` : null,
      calorieScore > 0 ? `• Calories (${calorieScore.toFixed(0)}/100): ${calorieExp}` : null,
      ingredientScore > 0 ? `• Ingredients (${ingredientScore.toFixed(0)}/100): ${ingredientExp}` : null
    ].filter(Boolean).join('\n');

    return {
      macroScore,
      vitaminMineralScore: vitaminScore,
      calorieScore,
      ingredientsScore: ingredientScore,
      overallScore,
      scoreExplanation: explanations
    };
  }
}