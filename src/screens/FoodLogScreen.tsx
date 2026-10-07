import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  X,
  Check,
} from 'lucide-react-native';
import { DailyLog, LoggedMeal, MealType, FoodItem } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import * as Haptics from 'expo-haptics';

interface FoodLogScreenProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  log: DailyLog;
  onAddMeal: (meal: LoggedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
  initialMealType?: MealType;
}

export const FoodLogScreen: React.FC<FoodLogScreenProps> = ({
  selectedDate,
  onSelectDate,
  log,
  onAddMeal,
  onRemoveMeal,
  initialMealType = 'breakfast',
}) => {
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>(initialMealType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingsCount, setServingsCount] = useState<number>(1);

  // Date navigation
  const handlePrevDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setActiveMealType(mealType);
    setSelectedFood(null);
    setServingsCount(1);
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSaveFood = () => {
    if (!selectedFood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const newMeal: LoggedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
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

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onRemoveMeal(id);
  };

  const mealCategories: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snacks' },
  ];

  return (
    <View style={styles.container}>
      {/* Date Navigator Header */}
      <View style={styles.dateHeader}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={handlePrevDay}>
          <ChevronLeft size={20} color="#94A3B8" />
        </TouchableOpacity>
        <View style={styles.dateTitleContainer}>
          <Text style={styles.dateTitle}>
            {isToday ? 'Today' : selectedDate}
          </Text>
        </View>
        <TouchableOpacity style={styles.dateNavBtn} onPress={handleNextDay}>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Daily Total Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalKcal}</Text>
          <Text style={styles.summaryLabel}>kcal</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{totalProtein}g</Text>
          <Text style={styles.summaryLabel}>Protein</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#06B6D4' }]}>{totalCarbs}g</Text>
          <Text style={styles.summaryLabel}>Carbs</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#EC4899' }]}>{totalFat}g</Text>
          <Text style={styles.summaryLabel}>Fat</Text>
        </View>
      </View>

      {/* Meal Groups */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mealCategories.map((cat) => {
          const categoryMeals = log.meals.filter((m) => m.mealType === cat.key);
          const categoryKcal = categoryMeals.reduce((s, m) => s + m.calories, 0);

          return (
            <View key={cat.key} style={styles.mealGroupCard}>
              <View style={styles.mealGroupHeader}>
                <View>
                  <Text style={styles.mealGroupTitle}>{cat.label}</Text>
                  <Text style={styles.mealGroupKcal}>{categoryKcal} kcal</Text>
                </View>
                <TouchableOpacity
                  style={styles.addFoodBtn}
                  onPress={() => openAddModal(cat.key)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color="#10B981" />
                  <Text style={styles.addFoodBtnText}>Add Food</Text>
                </TouchableOpacity>
              </View>

              {/* Items List */}
              {categoryMeals.length === 0 ? (
                <Text style={styles.emptyPrompt}>No food logged for {cat.label.toLowerCase()}</Text>
              ) : (
                categoryMeals.map((item) => (
                  <View key={item.id} style={styles.foodRow}>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <Text style={styles.foodPortion}>
                        {item.servings} × {item.servingSize} ({item.servingGrams}g)
                      </Text>
                      <Text style={styles.foodMacros}>
                        P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                      </Text>
                    </View>
                    <View style={styles.foodActions}>
                      <Text style={styles.foodKcal}>{item.calories} kcal</Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Food Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add to {activeMealType.charAt(0).toUpperCase() + activeMealType.slice(1)}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Search size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search food (e.g. egg, whey, rice)..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Selected Food Adjustment Bar */}
            {selectedFood && (
              <View style={styles.selectedBox}>
                <View style={styles.selectedTop}>
                  <Text style={styles.selectedName}>{selectedFood.name}</Text>
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
                      <Text style={styles.stepBtnText}>-</Text>
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
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.logConfirmBtnText}>Log Food</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Food List */}
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitleContainer: {
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  mealGroupCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  mealGroupKcal: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  addFoodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyPrompt: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  foodPortion: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  foodMacros: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  foodActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  foodKcal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  deleteBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '82%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
    marginLeft: 8,
  },
  selectedBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  selectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
  },
  selectedKcal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  portionLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  stepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  stepValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginHorizontal: 8,
  },
  logConfirmBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  logConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemKcal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
