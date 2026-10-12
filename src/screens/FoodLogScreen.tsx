import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  X,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, FoodItem } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { FoodDetailsModal } from '../components/FoodDetailsModal';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { addDaysToDateString, formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import { estimateMealFromText, PlateAnalysisResult } from '../services/plateAnalysisService';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { createUniqueId } from '../utils/idUtils';
import * as Haptics from 'expo-haptics';

interface FoodLogScreenProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  log: DailyLog;
  onAddMeal: (meal: LoggedMeal) => void;
  onUpdateMeal?: (meal: LoggedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
  initialMealType?: MealType;
  openAddOnMount?: boolean;
  onAutoOpenComplete?: () => void;
}

export const FoodLogScreen: React.FC<FoodLogScreenProps> = ({
  selectedDate,
  onSelectDate,
  log,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  initialMealType = 'breakfast',
  openAddOnMount = false,
  onAutoOpenComplete,
}) => {
  const [modalVisible, setModalVisible] = useState(openAddOnMount && selectedDate <= getTodayDateString());
  const [activeMealType, setActiveMealType] = useState<MealType>(initialMealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingsCount, setServingsCount] = useState<number>(1);
  const [inspectingMeal, setInspectingMeal] = useState<LoggedMeal | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiResult, setAiResult] = useState<PlateAnalysisResult | null>(null);
  const [aiGrams, setAiGrams] = useState<number[]>([]);
  const [aiMealType, setAiMealType] = useState<MealType>(initialMealType);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const language = useLanguage();
  const t = (value: string) => translate(language, value);
  const isFuture = selectedDate > getTodayDateString();

  useEffect(() => {
    if (openAddOnMount) onAutoOpenComplete?.();
  }, [openAddOnMount, onAutoOpenComplete]);

  // Date navigation
  const handlePrevDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, -1));
  };

  const handleNextDay = () => {
    if (selectedDate >= getTodayDateString()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectDate(addDaysToDateString(selectedDate, 1));
  };

  // Daily Totals
  const totalKcal = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(log.meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(log.meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(log.meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;

  // Filtered food search
  const filteredFoods = VERIFIED_FOOD_DATABASE.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openAddModal = (mealType: MealType) => {
    if (isFuture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveMealType(mealType);
    setSelectedFood(null);
    setServingsCount(1);
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSaveFood = () => {
    if (!selectedFood || isFuture) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const newMeal: LoggedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      brand: selectedFood.brand,
      category: selectedFood.category,
      mealType: activeMealType,
      servings: servingsCount,
      servingSize: selectedFood.servingSize,
      servingGrams: Math.round(selectedFood.servingGrams * servingsCount),
      calories: Math.round(selectedFood.calories * servingsCount),
      protein: Math.round(selectedFood.protein * servingsCount * 10) / 10,
      carbs: Math.round(selectedFood.carbs * servingsCount * 10) / 10,
      fat: Math.round(selectedFood.fat * servingsCount * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(newMeal);
    setModalVisible(false);
  };

  const handleEstimate = async () => {
    if (!aiDescription.trim() || aiBusy) return;
    setAiBusy(true);
    setAiError('');
    setAiResult(null);
    try {
      const estimateLanguage = language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';
      const result = await estimateMealFromText(aiDescription, estimateLanguage);
      setAiResult(result);
      setAiGrams(result.items.map(item => item.grams));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not estimate this meal. Try again.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleLogEstimate = (index: number) => {
    if (!aiResult || isFuture) return;
    const item = aiResult.items[index];
    const grams = Math.max(1, aiGrams[index] || item.grams);
    const scale = grams / item.grams;
    const meal: LoggedMeal = {
      id: createUniqueId('ai'),
      foodId: 'ai-estimate',
      name: item.name,
      mealType: aiMealType,
      servings: 1,
      servingSize: `${grams} g`,
      servingGrams: grams,
      calories: Math.round(item.calories * scale),
      protein: Math.round(item.protein * scale * 10) / 10,
      carbs: Math.round(item.carbs * scale * 10) / 10,
      fat: Math.round(item.fat * scale * 10) / 10,
      timestamp: new Date().toISOString(),
    };
    onAddMeal(meal);
    setAiResult({ ...aiResult, items: aiResult.items.filter((_, i) => i !== index) });
    setAiGrams(aiGrams.filter((_, i) => i !== index));
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onRemoveMeal(id);
  };

  const handleUpdateInspectingServings = (newServings: number) => {
    if (!inspectingMeal) return;
    const baseServings = inspectingMeal.servings > 0 ? inspectingMeal.servings : 1;
    const baseKcal = inspectingMeal.calories / baseServings;
    const baseProtein = inspectingMeal.protein / baseServings;
    const baseCarbs = inspectingMeal.carbs / baseServings;
    const baseFat = inspectingMeal.fat / baseServings;
    const baseGrams = inspectingMeal.servingGrams / baseServings;

    const updatedMeal: LoggedMeal = {
      ...inspectingMeal,
      servings: newServings,
      calories: Math.round(baseKcal * newServings),
      protein: Math.round(baseProtein * newServings * 10) / 10,
      carbs: Math.round(baseCarbs * newServings * 10) / 10,
      fat: Math.round(baseFat * newServings * 10) / 10,
      servingGrams: Math.round(baseGrams * newServings),
    };

    if (onUpdateMeal) {
      onUpdateMeal(updatedMeal);
    } else {
      onRemoveMeal(inspectingMeal.id);
      onAddMeal(updatedMeal);
    }
    setInspectingMeal(null);
  };

  const mealCategories: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snacks' },
  ];

  return (
    <View style={styles.container}>
      {/* Calm Calendar Navigation */}
      <View style={styles.dateHeader}>
        <TouchableOpacity
          style={[styles.dateNavBtn, selectedDate >= getTodayDateString() && styles.disabledButton]}
          onPress={handlePrevDay}
          accessibilityLabel="Previous day"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.datePickButton} onPress={() => setCalendarVisible(true)} accessibilityLabel={t('Choose date')} accessibilityRole="button">
          <CalendarDays size={17} color={theme.colors.primary} />
        <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavBtn}
          onPress={handleNextDay}
          disabled={selectedDate >= getTodayDateString()}
          accessibilityLabel="Next day"
          accessibilityRole="button"
        >
          <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.aiEntryButton, isFuture && styles.disabledButton]} onPress={() => { if (isFuture) return; setAiMealType(initialMealType); setAiModalVisible(true); }} disabled={isFuture} accessibilityRole="button">
        <View style={styles.aiEntryIcon}><Sparkles size={17} color={theme.colors.accent} /></View>
        <View style={styles.aiEntryCopy}><Text style={styles.aiEntryTitle}>Describe with AI</Text><Text style={styles.aiEntrySub}>Get an estimate, review portions, then log</Text></View>
        <ChevronRight size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      {/* Understated Daily Summary Strip */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalKcal}</Text>
          <Text style={styles.summaryLabel}>kcal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalProtein}g</Text>
          <Text style={styles.summaryLabel}>Protein</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCarbs}g</Text>
          <Text style={styles.summaryLabel}>Carbs</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalFat}g</Text>
          <Text style={styles.summaryLabel}>Fat</Text>
        </View>
      </View>

      {/* Meal Groups Scroll List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mealCategories.map((cat) => {
          const categoryMeals = log.meals.filter((m) => m.mealType === cat.key);
          const categoryKcal = categoryMeals.reduce((s, m) => s + m.calories, 0);

          return (
            <View key={cat.key} style={styles.mealSection}>
              {/* Category Header */}
              <View style={styles.mealSectionHeader}>
                <View>
                  <Text style={styles.categoryTitle}>{cat.label}</Text>
                  {categoryKcal > 0 && (
                    <Text style={styles.categoryKcal}>{categoryKcal} kcal</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addFoodBtn}
                  onPress={() => openAddModal(cat.key)}
                  accessibilityLabel={`Add food to ${cat.label}`}
                  accessibilityRole="button"
                >
                  <Plus size={14} color={theme.colors.primary} />
                  <Text style={styles.addFoodBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Items List */}
              {categoryMeals.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyPromptBox}
                  onPress={() => openAddModal(cat.key)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emptyPromptText}>
                    No {cat.label.toLowerCase()} logged yet. Tap to add.
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.foodListContainer}>
                  {categoryMeals.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.foodRow,
                        idx > 0 && styles.foodRowBorder,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setInspectingMeal(item);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName}>{item.name}</Text>
                        <Text style={styles.foodPortion}>
                          {item.servings} × {item.servingSize}
                        </Text>
                        <Text style={styles.foodMacros}>
                          P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                        </Text>
                      </View>

                      <View style={styles.foodRight}>
                        <Text style={styles.foodKcal}>{item.calories} kcal</Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          accessibilityLabel={`Delete ${item.name}`}
                          accessibilityRole="button"
                        >
                          <Trash2 size={15} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Food Modal: Focused, clean, clear typography */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add to {activeMealType.charAt(0).toUpperCase() + activeMealType.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Search size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('Search foods...')}
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {/* Selected Food Confirmation Bar */}
            {selectedFood && (
              <View style={styles.selectedBox}>
                <View style={styles.selectedTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedName}>{selectedFood.name}</Text>
                    <Text style={styles.selectedServingSub}>
                      {selectedFood.servingSize} per serving
                    </Text>
                  </View>
                  <Text style={styles.selectedKcal}>
                    {Math.round(selectedFood.calories * servingsCount)} kcal
                  </Text>
                </View>

                <View style={styles.portionRow}>
                  <Text style={styles.portionLabel}>Servings:</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setServingsCount((prev) => Math.max(0.5, prev - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{servingsCount}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setServingsCount((prev) => prev + 0.5)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.logConfirmBtn} onPress={handleSaveFood}>
                  <Check size={16} color={theme.colors.textInverted} />
                  <Text style={styles.logConfirmBtnText}>Log to Diary</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Food Search Results */}
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={styles.emptySearchBox}>
                  <Text style={styles.emptySearchTitle}>
                    No foods found matching &quot;{searchQuery}&quot;
                  </Text>
                  <Text style={styles.emptySearchSub}>
                    Try searching for common foods like chicken, eggs, rice, or oats.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedFood?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.searchItem, isSelected && styles.searchItemSelected]}
                    onPress={() => setSelectedFood(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <Text style={styles.itemSubtitle}>
                        {item.servingSize} • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
                      </Text>
                    </View>
                    <Text style={styles.itemKcal}>{item.calories} kcal</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onClose={() => setCalendarVisible(false)}
        onSelect={onSelectDate}
      />

      <Modal visible={aiModalVisible} animationType="slide" transparent onRequestClose={() => setAiModalVisible(false)}>
        <View style={[styles.modalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
          <View style={styles.aiModalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.aiModalTitleRow}><Sparkles size={18} color={theme.colors.accent} /><Text style={styles.modalTitle}>AI meal estimate</Text></View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} accessibilityLabel={t('Close')}><X size={20} color={theme.colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.aiHelper}>These are estimates, not measurements. Adjust portions to improve accuracy.</Text>
            <View style={styles.mealTypeRow}>
              {mealCategories.map(category => (
                <TouchableOpacity key={category.key} onPress={() => setAiMealType(category.key)} style={[styles.mealTypeChip, aiMealType === category.key && styles.mealTypeChipActive]}>
                  <Text style={[styles.mealTypeText, aiMealType === category.key && styles.mealTypeTextActive]}>{category.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.aiDescriptionInput}
              value={aiDescription}
              onChangeText={setAiDescription}
              placeholder={t('Describe what you ate')}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={1000}
              editable={!aiBusy}
            />
            <TouchableOpacity style={[styles.estimateButton, (!aiDescription.trim() || aiBusy) && styles.disabledButton]} onPress={handleEstimate} disabled={!aiDescription.trim() || aiBusy}>
              {aiBusy ? <ActivityIndicator size="small" color={theme.colors.textInverted} /> : <Sparkles size={16} color={theme.colors.textInverted} />}
              <Text style={styles.estimateButtonText}>{aiBusy ? 'Estimating…' : 'Estimate nutrition'}</Text>
            </TouchableOpacity>
            {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}
            {aiResult ? (
              <ScrollView style={styles.aiResults} keyboardShouldPersistTaps="handled">
                <Text style={styles.resultsTitle}>{aiResult.mealName} · {aiResult.items.reduce((sum, item, index) => sum + Math.round(item.calories * (Math.max(1, aiGrams[index] || item.grams) / item.grams)), 0)} kcal estimated</Text>
                {aiResult.items.length === 0 ? <Text style={styles.aiHelper}>All foods added to diary.</Text> : null}
                {aiResult.items.map((item, index) => {
                  const grams = Math.max(1, aiGrams[index] || item.grams);
                  const scale = grams / item.grams;
                  return (
                    <View key={`${item.name}_${index}`} style={styles.aiResultCard}>
                      <View style={styles.resultTop}>
                        <View style={{ flex: 1 }}><Text style={styles.resultName}>{item.name}</Text><Text style={styles.resultPortion}>{item.portionEstimate} · {item.confidence} confidence</Text></View>
                        <Text style={styles.resultCalories}>{Math.round(item.calories * scale)} kcal</Text>
                      </View>
                      <Text style={styles.resultMacros}>P {Math.round(item.protein * scale)}g · C {Math.round(item.carbs * scale)}g · F {Math.round(item.fat * scale)}g</Text>
                      <View style={styles.resultBottom}>
                        <View style={styles.gramsInputRow}><Text style={styles.gramsLabel}>Portion (g)</Text><TextInput style={styles.gramsInput} value={String(grams)} keyboardType="number-pad" onChangeText={value => setAiGrams(current => current.map((amount, i) => i === index ? Math.max(1, Number(value) || 1) : amount))} /></View>
                        <TouchableOpacity style={styles.logEstimateButton} onPress={() => handleLogEstimate(index)}><Plus size={14} color={theme.colors.textInverted} /><Text style={styles.logEstimateText}>Add to diary</Text></TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                <Text style={styles.aiDisclaimer}>{aiResult.disclaimer}</Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Food Details & Serving Adjustment Modal */}
      <FoodDetailsModal
        visible={inspectingMeal !== null}
        item={inspectingMeal}
        isLogged={true}
        onClose={() => setInspectingMeal(null)}
        onSave={handleUpdateInspectingServings}
        onDelete={() => {
          if (inspectingMeal) {
            handleDelete(inspectingMeal.id);
            setInspectingMeal(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 5, paddingVertical: 4 },
  dateTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  aiEntryButton: { flexDirection: 'row', alignItems: 'center', gap: 11, marginHorizontal: theme.spacing.md, marginTop: 10, padding: 11, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  disabledButton: { opacity: 0.5 },
  aiEntryIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  aiEntryCopy: { flex: 1, gap: 2 },
  aiEntryTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  aiEntrySub: { color: theme.colors.textMuted, fontSize: 10 },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    backgroundColor: theme.colors.border,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 178,
    gap: 16,
  },
  mealSection: {
    gap: 8,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  categoryKcal: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
  },
  addFoodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyPromptBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyPromptText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  foodListContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.subtle,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
  },
  foodRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  foodPortion: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  foodMacros: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  foodRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  foodKcal: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteBtn: {
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    height: '84%',
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  selectedBox: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  selectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedServingSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedKcal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  portionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  stepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  logConfirmBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchItemSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemKcal: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  aiModalSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, height: '88%', padding: theme.spacing.md },
  aiModalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiHelper: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  mealTypeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceSubtle },
  mealTypeChipActive: { backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primaryBorder },
  mealTypeText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  mealTypeTextActive: { color: theme.colors.primary },
  aiDescriptionInput: { minHeight: 82, maxHeight: 120, padding: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSubtle, color: theme.colors.textPrimary, textAlignVertical: 'top', fontSize: 14 },
  estimateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 12, marginTop: 9 },
  estimateButtonText: { color: theme.colors.textInverted, fontSize: 13, fontWeight: '700' },
  aiError: { color: theme.colors.danger, fontSize: 12, marginTop: 8 },
  aiResults: { marginTop: 10, flexGrow: 0 },
  resultsTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  aiResultCard: { padding: 11, marginBottom: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, gap: 6 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  resultPortion: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
  resultCalories: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  resultMacros: { color: theme.colors.textSecondary, fontSize: 11 },
  resultBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 },
  gramsInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gramsLabel: { color: theme.colors.textMuted, fontSize: 10 },
  gramsInput: { width: 56, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface, textAlign: 'center', color: theme.colors.textPrimary, fontSize: 12 },
  logEstimateButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary },
  logEstimateText: { color: theme.colors.textInverted, fontSize: 11, fontWeight: '700' },
  aiDisclaimer: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4, marginBottom: 18 },
  emptySearchBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptySearchSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
