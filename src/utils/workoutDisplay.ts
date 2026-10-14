import { WorkoutEntry } from '../types';

export interface WorkoutDisplayMeta {
  category: string;
  duration: string;
  calories: string;
  sets?: string;
  estimate?: string;
}

/** Build short independent labels so translated workout details can wrap safely. */
export function getWorkoutDisplayMeta(
  workout: WorkoutEntry,
  translate: (value: string) => string,
): WorkoutDisplayMeta {
  const category = workout.category[0].toUpperCase() + workout.category.slice(1);
  const completedSets = workout.sets?.filter((set) => set.completed).length ?? 0;

  return {
    category: translate(category),
    duration: `${workout.durationMinutes} ${translate('min')}`,
    calories: `${workout.caloriesBurned} ${translate('kcal')}`,
    ...(workout.sets?.length
      ? { sets: `${workout.sets.length} ${translate('sets')} · ${completedSets} ${translate('completed')}` }
      : {}),
    ...(workout.calorieSource === 'met_estimate' ? { estimate: translate('Estimate') } : {}),
  };
}
