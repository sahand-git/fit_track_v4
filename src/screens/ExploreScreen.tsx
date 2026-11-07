import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../components/AppText';
import {
  Search,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { FoodItem, MealType } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { getLocalizedFoodName } from '../utils/foodLocalization';
import { formatServingWithGrams } from '../utils/formatServing';
import { FoodThumbnail } from '../components/FoodThumbnail';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useIsRTL } from '../hooks/useIsRTL';

interface ExploreScreenProps {
  onSelectFood: (food: FoodItem, mealType?: MealType, servings?: number) => void;
  onBack?: () => void;
}

interface CategoryChip {
  id: string;
  labelKey: string;
  icon: string;
  matchFn: (item: FoodItem) => boolean;
}

const CATEGORIES: CategoryChip[] = [
  { id: 'soups', labelKey: 'Soups', icon: '🍲', matchFn: (f) => /soup|شوربة|شۆربا/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'rice', labelKey: 'Rice', icon: '🍚', matchFn: (f) => /rice|رز|تمن|برنج/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'grilled', labelKey: 'Grilled', icon: '🔥', matchFn: (f) => /grilled|مشوي|برژاو/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'salads', labelKey: 'Salads', icon: '🥗', matchFn: (f) => /salad|سلطة|زەڵاتە/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'breakfast', labelKey: 'Breakfast', icon: '🍳', matchFn: (f) => /egg|cheese|labneh|جبن|لبنة|هێلکە|قەیماغ/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'dolma', labelKey: 'Dolma', icon: '🫑', matchFn: (f) => /dolma|دولمة|دۆڵمە/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'kebab', labelKey: 'Kebab', icon: '🍢', matchFn: (f) => /kebab|كباب|کەباب/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'bread', labelKey: 'Bread', icon: '🥖', matchFn: (f) => /bread|samoon|خبز|صمون|نان/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'sweets', labelKey: 'Sweets', icon: '🍯', matchFn: (f) => /baklava|knafeh|sweet|حلوى|بقلاوة|شیرینی/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'drinks', labelKey: 'Drinks', icon: '🧃', matchFn: (f) => /tea|coffee|juice|water|شاي|قهوة|عصير|چا|قاوە/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'fruits', labelKey: 'Fruits', icon: '🍎', matchFn: (f) => /apple|banana|orange|date|تمر|تفاح|سێو|خورما/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
  { id: 'vegetables', labelKey: 'Vegetables', icon: '🥦', matchFn: (f) => /vegetable|tomato|cucumber|خضار|طماطم|تەماتە|خەیار/i.test(f.name + (f.nameAr || '') + (f.nameCkb || '')) },
];

const NUTRIENT_FILTERS = [
  { id: 'high_protein', labelKey: 'High Protein', filterFn: (f: FoodItem) => f.protein >= 15 },
  { id: 'low_carb', labelKey: 'Low Carb', filterFn: (f: FoodItem) => f.carbs <= 10 },
  { id: 'high_fiber', labelKey: 'High Fiber', filterFn: (f: FoodItem) => (f.fiber || 0) >= 4 },
  { id: 'low_fat', labelKey: 'Low Fat', filterFn: (f: FoodItem) => f.fat <= 3 },
  { id: 'iron_rich', labelKey: 'Iron-Rich', filterFn: (f: FoodItem) => (f.iron || 0) >= 2 },
  { id: 'vitamin_c', labelKey: 'Vitamin C', filterFn: (f: FoodItem) => (f.vitaminC || 0) >= 15 },
] as const;

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  onSelectFood,
  onBack,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRtl = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNutrientFilter, setSelectedNutrientFilter] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const [selectedFoodToLog, setSelectedFoodToLog] = useState<FoodItem | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 15) return 'lunch';
    if (hr < 18) return 'snack';
    return 'dinner';
  });
  const [servings, setServings] = useState(1);

  // Filter food items
  const filteredFoods = useMemo(() => {
    let list = VERIFIED_FOOD_DATABASE;

    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => {
        const en = (f.name || '').toLowerCase();
        const ar = (f.nameAr || '').toLowerCase();
        const ckb = (f.nameCkb || '').toLowerCase();
        const aliases = (f.aliases || []).join(' ').toLowerCase();
        return en.includes(q) || ar.includes(q) || ckb.includes(q) || aliases.includes(q);
      });
    }

    // Category filter
    if (selectedCategory) {
      const cat = CATEGORIES.find((c) => c.id === selectedCategory);
      if (cat) {
        list = list.filter(cat.matchFn);
      }
    }

    // Nutrient filter
    if (selectedNutrientFilter) {
      const nf = NUTRIENT_FILTERS.find((n) => n.id === selectedNutrientFilter);
      if (nf) {
        list = list.filter(nf.filterFn);
      }
    }

    return list;
  }, [searchQuery, selectedCategory, selectedNutrientFilter]);

  const handleFoodPress = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedFoodToLog(food);
    setServings(1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        {onBack && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
          >
            {isRtl ? <ChevronRight size={20} color={theme.colors.textPrimary} /> : <ChevronLeft size={20} color={theme.colors.textPrimary} />}
          </TouchableOpacity>
        )}
        <Text style={styles.screenTitle}>{t('Explore Foods')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setIsGridView(!isGridView);
          }}
          accessibilityRole="button"
          accessibilityLabel={isGridView ? t('List view') : t('Grid view')}
        >
          {isGridView ? <List size={18} color={theme.colors.textPrimary} /> : <LayoutGrid size={18} color={theme.colors.textPrimary} />}
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('Search verified regional & global foods...')}
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Cultural & Regional Category Chips */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCircleCard, isSelected && styles.categoryCircleCardSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedCategory(isSelected ? null : cat.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(cat.labelKey)}
              >
                <View style={styles.categoryEmojiBox}>
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                </View>
                <Text
                  style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
                  numberOfLines={1}
                >
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Nutrient Filters Row */}
      <View style={styles.nutrientFiltersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.nutrientFiltersScroll}
        >
          {NUTRIENT_FILTERS.map((nf) => {
            const isSelected = selectedNutrientFilter === nf.id;
            return (
              <TouchableOpacity
                key={nf.id}
                style={[styles.nutrientPill, isSelected && styles.nutrientPillSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedNutrientFilter(isSelected ? null : nf.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(nf.labelKey)}
              >
                <Text
                  style={[styles.nutrientPillText, isSelected && styles.nutrientPillTextSelected]}
                >
                  {t(nf.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filteredFoods.length} {t('foods found')}
        </Text>
      </View>

      {/* Foods FlatList */}
      <FlatList
        data={filteredFoods}
        key={isGridView ? 'grid_2' : 'list_1'}
        numColumns={isGridView ? 2 : 1}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const localizedName = getLocalizedFoodName(item, language);
          if (isGridView) {
            return (
              <AnimatedPressable
                style={styles.gridCard}
                onPress={() => handleFoodPress(item)}
                minScale={0.96}
                accessibilityRole="button"
                accessibilityLabel={localizedName}
              >
                <FoodThumbnail
                  name={item.name}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  size="medium"
                />
                <Text style={styles.gridTitle} numberOfLines={2}>
                  {localizedName}
                </Text>
                <Text style={styles.gridKcal}>
                  {item.calories} {t('kcal')}
                </Text>
                <View style={styles.macroPillRow}>
                  <Text style={[styles.macroPill, { color: theme.colors.macroProtein }]}>
                    P: {item.protein}g
                  </Text>
                  <Text style={[styles.macroPill, { color: theme.colors.macroCarbs }]}>
                    C: {item.carbs}g
                  </Text>
                  <Text style={[styles.macroPill, { color: theme.colors.macroFat }]}>
                    F: {item.fat}g
                  </Text>
                </View>
              </AnimatedPressable>
            );
          }

          return (
            <AnimatedPressable
              style={styles.listCard}
              onPress={() => handleFoodPress(item)}
              minScale={0.98}
              accessibilityRole="button"
              accessibilityLabel={localizedName}
            >
              <FoodThumbnail
                name={item.name}
                category={item.category}
                imageUrl={item.imageUrl}
                size="small"
              />
              <View style={styles.listInfo}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {localizedName}
                </Text>
                <Text style={styles.listServing} numberOfLines={1}>
                  {item.servingSize}
                </Text>
                <View style={styles.macroPillRow}>
                  <Text style={[styles.macroPill, { color: theme.colors.macroProtein }]}>
                    {t('Protein')} {item.protein}g
                  </Text>
                  <Text style={styles.macroDot}>·</Text>
                  <Text style={[styles.macroPill, { color: theme.colors.macroCarbs }]}>
                    {t('Carbs')} {item.carbs}g
                  </Text>
                  <Text style={styles.macroDot}>·</Text>
                  <Text style={[styles.macroPill, { color: theme.colors.macroFat }]}>
                    {t('Fat')} {item.fat}g
                  </Text>
                </View>
              </View>
              <View style={styles.listKcalBox}>
                <Text style={styles.listKcalNumber}>{item.calories}</Text>
                <Text style={styles.listKcalLabel}>{t('kcal')}</Text>
              </View>
            </AnimatedPressable>
          );
        }}
      />

      {/* Meal & Portion Selection Modal */}
      {selectedFoodToLog && (
        <Modal
          visible={Boolean(selectedFoodToLog)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedFoodToLog(null)}
          statusBarTranslucent
          navigationBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {/* Modal Header */}
              <View style={[styles.modalHeader, isRtl && styles.rowRtl]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {getLocalizedFoodName(selectedFoodToLog, language)}
                  </Text>
                  <Text style={styles.modalSub}>
                    {formatServingWithGrams(selectedFoodToLog.servingSize, selectedFoodToLog.servingGrams, servings)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedFoodToLog(null)}
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Scaled Macro Pills */}
              <View style={[styles.modalMacroRow, isRtl && styles.rowRtl]}>
                <View style={[styles.modalMacroPill, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[styles.modalMacroVal, { color: theme.colors.primary }]}>
                    {Math.round(selectedFoodToLog.calories * servings)} {t('kcal')}
                  </Text>
                </View>
                <View style={[styles.modalMacroPill, { backgroundColor: theme.colors.surfaceSubtle }]}>
                  <Text style={styles.modalMacroVal}>
                    {Math.round(selectedFoodToLog.protein * servings * 10) / 10}g {t('Protein')}
                  </Text>
                </View>
                <View style={[styles.modalMacroPill, { backgroundColor: theme.colors.surfaceSubtle }]}>
                  <Text style={styles.modalMacroVal}>
                    {Math.round(selectedFoodToLog.carbs * servings * 10) / 10}g {t('Carbs')}
                  </Text>
                </View>
                <View style={[styles.modalMacroPill, { backgroundColor: theme.colors.surfaceSubtle }]}>
                  <Text style={styles.modalMacroVal}>
                    {Math.round(selectedFoodToLog.fat * servings * 10) / 10}g {t('Fat')}
                  </Text>
                </View>
              </View>

              {/* Meal Slot Picker */}
              <Text style={styles.modalSectionLabel}>{t('Add to which meal?')}</Text>
              <View style={[styles.mealPickerRow, isRtl && styles.rowRtl]}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => {
                  const isSelected = selectedMealType === m;
                  const label = m === 'breakfast' ? t('Breakfast') : m === 'lunch' ? t('Lunch') : m === 'dinner' ? t('Dinner') : t('Snack');
                  const emoji = m === 'breakfast' ? '🍳' : m === 'lunch' ? '🍝' : m === 'dinner' ? '🍽️' : '🍪';
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.mealChip, isSelected && styles.mealChipActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setSelectedMealType(m);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                    >
                      <Text style={styles.mealChipEmoji}>{emoji}</Text>
                      <Text style={[styles.mealChipText, isSelected && styles.mealChipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Servings Stepper */}
              <Text style={styles.modalSectionLabel}>{t('Servings')}</Text>
              <View style={[styles.stepperContainer, isRtl && styles.rowRtl]}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    if (servings > 0.5) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10));
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Decrease servings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Minus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepperVal}>
                  {servings} {servings === 1 ? t('serving') : t('servings')}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setServings((s) => Math.round((s + 0.5) * 10) / 10);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Increase servings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Plus size={16} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  onSelectFood(selectedFoodToLog, selectedMealType, servings);
                  setSelectedFoodToLog(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Log Food')}
              >
                <Check size={18} color={theme.colors.textInverted} />
                <Text style={styles.modalAddBtnText}>
                  {t('Log to')} {selectedMealType === 'breakfast' ? t('Breakfast') : selectedMealType === 'lunch' ? t('Lunch') : selectedMealType === 'dinner' ? t('Dinner') : t('Snack')} ({Math.round(selectedFoodToLog.calories * servings)} {t('kcal')})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    screenTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.md,
      marginVertical: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    categoriesContainer: {
      marginVertical: 6,
    },
    categoriesScroll: {
      paddingHorizontal: theme.spacing.md,
      paddingEnd: theme.spacing.xl + 24,
      gap: 12,
    },
    categoryCircleCard: {
      alignItems: 'center',
      width: 62,
    },
    categoryCircleCardSelected: {
      opacity: 1,
    },
    categoryEmojiBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    categoryEmoji: {
      fontSize: 22,
    },
    categoryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    categoryLabelSelected: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    nutrientFiltersContainer: {
      marginVertical: 4,
    },
    nutrientFiltersScroll: {
      paddingHorizontal: theme.spacing.md,
      gap: 8,
    },
    nutrientPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    nutrientPillSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    nutrientPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    nutrientPillTextSelected: {
      color: theme.colors.textInverted,
    },
    countRow: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    countText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 40,
      gap: 10,
    },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
    },
    listInfo: {
      flex: 1,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    listServing: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    macroPillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    macroPill: {
      fontSize: 12,
      fontWeight: '600',
    },
    macroDot: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    listKcalBox: {
      alignItems: 'flex-end',
    },
    listKcalNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    listKcalLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    gridCard: {
      flex: 1,
      margin: 4,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      alignItems: 'center',
    },
    gridTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginTop: 6,
    },
    gridKcal: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 2,
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
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    dragHandleContainer: {
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 8,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    modalSub: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalMacroRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 4,
    },
    modalMacroPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
    },
    modalMacroVal: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    modalSectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 6,
    },
    mealPickerRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    mealChip: {
      flex: 1,
      minWidth: '22%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mealChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    mealChipEmoji: {
      fontSize: 14,
    },
    mealChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    mealChipTextActive: {
      color: theme.colors.textInverted,
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      backgroundColor: theme.colors.surfaceSubtle,
      borderRadius: theme.radius.md,
      paddingVertical: 6,
    },
    stepperBtn: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepperVal: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      minWidth: 80,
      textAlign: 'center',
    },
    modalAddBtn: {
      height: 48,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    modalAddBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textInverted,
    },
    rowRtl: {
      flexDirection: 'row-reverse',
    },
  });
