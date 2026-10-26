export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';

export type FitnessGoal =
  | 'fat_loss_aggressive'
  | 'fat_loss_moderate'
  | 'maintenance'
  | 'lean_bulk'
  | 'muscle_gain';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type AppLanguage = 'en' | 'ar' | 'ckb';
export type SupplementCategory = 'vitamin' | 'mineral' | 'supplement' | 'other';
export type SupplementTime = 'morning' | 'afternoon' | 'evening' | 'bedtime';

export interface SupplementRoutineItem {
  id: string;
  name: string;
  category?: SupplementCategory;
  amount?: number;
  unit?: string;
  dose?: string; // legacy or free-text dose
  note?: string;
  time: SupplementTime;
}

export interface SupplementCheck {
  itemId: string;
  taken: boolean;
  takenAt?: string;
}

export interface LoggedDailySupplement {
  id: string;
  routineItemId?: string;
  name: string;
  category?: SupplementCategory;
  amount?: number;
  unit?: string;
  dose?: string;
  note?: string;
  time: SupplementTime;
  taken: boolean;
  takenAt?: string;
}

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
  language?: AppLanguage;
  isOnboarded?: boolean;
  includeWorkoutsInCalorieBudget?: boolean; // off by default: workout burn is tracked without inflating food budget
  stepGoal?: number;
  targetWeightKg?: number;
  hasAcceptedMedicalDisclaimer?: boolean;
  customNutrientGoals?: Partial<Record<string, number>>;
  enableCrashReporting?: boolean;
  themeMode?: 'system' | 'light' | 'dark';
}

export type ExerciseCategory = 'strength' | 'cardio' | 'hiit' | 'sports' | 'flexibility';

export interface ExerciseSet {
  setNum: number;
  weightKg?: number;
  reps?: number;
  completed?: boolean;
}

export interface WorkoutEntry {
  id: string;
  name: string;
  category: ExerciseCategory;
  durationMinutes: number;
  caloriesBurned: number;
  sets?: ExerciseSet[];
  loggedAt: string;
  calorieSource?: 'user_entered' | 'met_estimate';
  note?: string;
}

export type PortionUnit = 'g' | 'piece' | 'spoon' | 'glass' | 'samoon' | 'bowl' | 'plate' | 'serving';

export interface RecipeIngredient {
  name: string;
  grams: number;
  source: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodVariant {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  servingGrams?: number;
  ingredients?: RecipeIngredient[];
  description?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  nameAr?: string;
  nameCkb?: string;
  brand?: string;
  servingSize: string;
  servingGrams: number;
  unit?: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category?: string;
  barcode?: string;
  imageUrl?: string;
  source?: 'verified_database' | 'usda_sr28' | 'custom' | 'open_food_facts' | 'ai_estimated' | 'regional_culinary_estimate' | 'generic_estimate' | 'gemini';
  fiber?: number;
  sugar?: number; // Canonical sugar content in grams
  sugars?: number; // Maintained for database schema compatibility
  nutriScore?: string;
  sodium?: number; // mg
  potassium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
  vitaminC?: number; // mg
  vitaminA?: number; // mcg
  vitaminD?: number; // mcg
  vitaminB12?: number; // mcg
  magnesium?: number; // mg
  zinc?: number; // mg
  isEstimate?: boolean;
  isIncomplete?: boolean;
  incompleteReason?: string;
  portionUnit?: PortionUnit;
  gramsPerUnit?: number;
  ingredients?: RecipeIngredient[];
  variants?: FoodVariant[];
  recipeEstimate?: boolean;
}

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
  timestamp: string;
}

export interface LoggedMeal {
  id: string;
  foodId: string;
  name: string;
  nameAr?: string;
  nameCkb?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  mealType: MealType;
  servings: number;
  servingSize: string;
  servingGrams: number;
  unit?: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminA?: number;
  vitaminD?: number;
  vitaminB12?: number;
  magnesium?: number;
  zinc?: number;
  barcode?: string;
  source?: 'verified_database' | 'usda_sr28' | 'custom' | 'open_food_facts' | 'ai_estimated' | 'regional_culinary_estimate' | 'generic_estimate' | 'gemini';
  timestamp: string; // ISO string
  isEstimate?: boolean;
  isIncomplete?: boolean;
  incompleteReason?: string;
  portionUnit?: PortionUnit;
  gramsPerUnit?: number;
  copiedFromId?: string;
  copiedFromDate?: string;
  ingredients?: RecipeIngredient[];
  variants?: FoodVariant[];
  selectedVariantId?: string;
  variantName?: string;
  recipeEstimate?: boolean;
}

export interface CopyYesterdayResult extends DailyLog {
  addedCount: number;
  alreadyCopiedCount: number;
  totalYesterdayCount: number;
  totalYesterdayKcal: number;
}

export interface MealTemplateItem {
  name: string;
  servingSize: string;
  servingGrams: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  portionUnit?: PortionUnit;
  gramsPerUnit?: number;
  isEstimate?: boolean;
  source?: FoodItem['source'];
}

export interface MealTemplate {
  id: string;
  name: string;
  mealType?: MealType;
  items: MealTemplateItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
}

export interface AICoachReport {
  overallGrade: string; // e.g. "A", "B+", "C"
  headline: string;
  caloricBalance: string;
  macroBreakdown: string;
  mistakesAndBlindSpots: string[];
  actionableTomorrowFixes: string[];
  customMealSuggestion: string;
  coachNote: string;
  generatedAt: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: LoggedMeal[];
  waterGlasses: number;
  steps: number;
  supplements?: SupplementCheck[];
  dailySupplements?: LoggedDailySupplement[];
  workouts?: WorkoutEntry[];
  aiReport?: AICoachReport;
}

export interface TimeSetting {
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface WaterReminderSetting {
  enabled: boolean;
  intervalHours: number;
  startHour: number;
  endHour: number;
}

export interface ReminderSettings {
  supplementsEnabled: boolean;
  supplementTimes: Record<SupplementTime, TimeSetting>;
  water: WaterReminderSetting;
  meals: Record<MealType, TimeSetting>;
}

export interface FitTrackBackup {
  version: '4.0';
  exportedAt: string;
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  supplementRoutine: SupplementRoutineItem[];
  weightHistory: WeightEntry[];
  reminderSettings?: ReminderSettings;
  recentFoods?: FoodItem[];
  favoriteFoods?: FoodItem[];
  customFoods?: FoodItem[];
  barcodeCache?: FoodItem[];
  mealTemplates?: MealTemplate[];
}

export interface BackupSummary {
  daysCount: number;
  mealsCount: number;
  workoutsCount: number;
  weightsCount: number;
  routineItemsCount: number;
  hasProfile: boolean;
  hasReminders: boolean;
  templatesCount?: number;
}
