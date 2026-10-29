# FitTrack v4 — Performance Profiling & Optimization Notes

## Baseline Measurements (Step 0 — Before Optimizations)

Measurements gathered on a mid-range Android phone (3-button navigation, dark theme) and verified with JavaScript runtime profiler (`console.time` / React Profiler):

| Interaction | Before (Baseline) | Target | Notes / Bottleneck |
| :--- | :--- | :--- | :--- |
| **Pressing "Add food" until interactive** | **~980 ms** (850 – 1,250 ms) | $\le$ 300 ms | Unvirtualized `.map()` renders all 284 verified foods; 9 storage calls in `Promise.all` fire before open animation; per-row `StyleSheet.create` in `FoodThumbnail` and `FoodSourceBadge`. |
| **Typing a letter in search** | **~240 ms** (180 – 320 ms) | $\le$ 50 ms (0 lag) | Entire catalog is re-filtered and all rows re-render on every single keystroke without memoization or virtualization. |
| **Switching tabs (Today $\leftrightarrow$ Diary $\leftrightarrow$ Coach $\leftrightarrow$ Progress)** | **~340 ms** (280 – 450 ms) | $\le$ 80 ms | `App.tsx` recreates `t` and screen callbacks on every render; `DashboardScreen`, `FoodLogScreen`, `CoachScreen` lack `React.memo`. |
| **Changing the date in Diary** | **~290 ms** (220 – 380 ms) | $\le$ 100 ms | Date state update at root cascades re-renders across all screens and bottom dock navigators. |
| **Opening Add Food Sheet impact on background tabs** | **Re-renders all screens** (Today/Diary/Coach) | **0 background re-renders** | `addSheetConfig` in root `App.tsx` triggers full component tree re-render on modal open/close. |

---

## Action Plan by Step

1. **Step 1 (Virtualized List)**: Replace `filteredFoods.map(...)` and `onlineFoods.map(...)` in `AddFoodSheet.tsx` with virtualized `FlatList` with `initialNumToRender={12}`, `windowSize={5}`, `maxToRenderPerBatch={10}`, memoized row component, and fixed-height `getItemLayout`.
2. **Step 2 (Empty Search Hierarchy)**: With empty search, do not render entire 284-item catalog. Show Recents, Frequent, Favorites first, followed by category chips and Regional list. Full catalog only renders when user types a search query or selects a category filter.
3. **Step 3 (StyleSheet Caching)**: Cache `FoodThumbnail` and `FoodSourceBadge` styles module-wide per theme (`themeCache`) to eliminate hundreds of redundant `StyleSheet.create()` allocations per render.
4. **Step 4 (Deferred Mounting & Loading)**: Mount heavy sheet content only on first open. Defer non-essential storage loading (`loadRecentFoods`, `loadMealTemplates`, `getYesterdayMealsPreview`, `getStoredGeminiApiKey`) until after open animation via `InteractionManager.runAfterInteractions`.
5. **Step 5 (Root State & Screen Memoization)**: Wrap `DashboardScreen`, `FoodLogScreen`, `CoachScreen`, `ProgressScreen` in `React.memo`. Stabilize `t` function with `useCallback([language])` and stabilize all screen callbacks in `App.tsx` so opening/closing `AddFoodSheet` does not re-render background screens.
6. **Step 6 (Clean Row Animations)**: Remove `entering`/`exiting` animations from bulk-rendered list rows; keep animations only for user-added/removed items.
7. **Step 7 (Stress Test & Scaling)**: Validate performance with synthetic 1,000-food catalog test to guarantee sub-millisecond filtering and smooth 60fps scrolling as the food database expands.
