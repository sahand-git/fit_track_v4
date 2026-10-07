export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';

export type FitnessGoal =
  | 'fat_loss_aggressive'
  | 'fat_loss_moderate'
  | 'maintenance'
  | 'lean_bulk'
  | 'muscle_gain';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterTargetGlasses: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category?: string;
}

export interface LoggedMeal {
  id: string;
  foodId: string;
  name: string;
  mealType: MealType;
  servings: number;
  servingSize: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string; // ISO string
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMeal[];
  waterGlasses: number;
  steps: number;
}
