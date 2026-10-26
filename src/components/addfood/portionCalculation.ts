import { FoodItem, FoodVariant } from '../../types';

export interface PortionCalculations {
  activeCalories: number;
  activeProtein: number;
  activeCarbs: number;
  activeFat: number;
  totalGrams: number;
  baseServingGrams: number;
  scaleRatio: number;
}

export function calculatePortionMacros(
  food: FoodItem,
  servingsCount: number,
  activeVariant?: FoodVariant
): PortionCalculations {
  const activeCalories = activeVariant ? activeVariant.calories : food.calories;
  const activeProtein = activeVariant ? activeVariant.protein : food.protein;
  const activeCarbs = activeVariant ? activeVariant.carbs : food.carbs;
  const activeFat = activeVariant ? activeVariant.fat : food.fat;
  const effectiveGramsPerUnit =
    activeVariant?.servingGrams ?? (food.gramsPerUnit ?? food.servingGrams);
  const totalGrams = Math.round(effectiveGramsPerUnit * servingsCount);
  const baseServingGrams =
    activeVariant?.servingGrams ?? (food.servingGrams > 0 ? food.servingGrams : 100);
  const scaleRatio = totalGrams / baseServingGrams;

  return {
    activeCalories,
    activeProtein,
    activeCarbs,
    activeFat,
    totalGrams,
    baseServingGrams,
    scaleRatio,
  };
}
