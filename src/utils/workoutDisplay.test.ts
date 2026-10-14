import { WorkoutEntry } from '../types';
import { getWorkoutDisplayMeta } from './workoutDisplay';

const workout: WorkoutEntry = {
  id: 'workout-test',
  name: 'Running',
  category: 'cardio',
  durationMinutes: 45,
  caloriesBurned: 420,
  calorieSource: 'met_estimate',
  loggedAt: '2026-10-13T10:00:00.000Z',
  sets: [
    { setNum: 1, weightKg: 20, reps: 10, completed: true },
    { setNum: 2, weightKg: 20, reps: 10, completed: false },
  ],
};

const translate = (value: string) => value;
const meta = getWorkoutDisplayMeta(workout, translate);

if (meta.category !== 'Cardio') throw new Error('Workout category should be a separate label.');
if (meta.duration !== '45 min') throw new Error('Duration should be a separate label.');
if (meta.calories !== '420 kcal') throw new Error('Calories should be a separate label.');
if (meta.sets !== '2 sets · 1 completed') throw new Error('Strength details should stay in their own wrapping label.');
if (meta.estimate !== 'Estimate') throw new Error('Estimated calorie values should be clearly identified.');

console.log('Workout display metadata tests passed.');
