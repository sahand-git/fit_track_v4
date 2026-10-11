import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  X,
  Search,
  Barcode,
  CheckCircle,
  Plus,
  Minus,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { LoggedMeal, MealType, FoodItem } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ScannerScreenProps {
  onBack: () => void;
  onAddMeal: (meal: LoggedMeal) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onBack,
  onAddMeal,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedFood, setMatchedFood] = useState<FoodItem | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [servings, setServings] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [isLogged, setIsLogged] = useState(false);

  const handleLookupBarcode = (codeToLookup?: string) => {
    const raw = (codeToLookup || barcodeInput).trim();
    if (!raw) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSearchStatus('searching');

    const match = VERIFIED_FOOD_DATABASE.find(
      (f) => f.barcode === raw || f.id.toLowerCase() === raw.toLowerCase()
    );

    setTimeout(() => {
      if (match) {
        setMatchedFood(match);
        setSearchStatus('found');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setMatchedFood(null);
        setSearchStatus('not_found');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    }, 250);
  };

  const handleSelectQuickSample = (sampleBarcode: string) => {
    setBarcodeInput(sampleBarcode);
    handleLookupBarcode(sampleBarcode);
  };

  const handleLogProduct = () => {
    if (!matchedFood) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLogged(true);

    const meal: LoggedMeal = {
      id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      foodId: matchedFood.id,
      name: matchedFood.name,
      brand: matchedFood.brand,
      category: matchedFood.category,
      mealType: selectedMeal,
      servings,
      servingSize: matchedFood.servingSize,
      servingGrams: Math.round(matchedFood.servingGrams * servings),
      calories: Math.round(matchedFood.calories * servings),
      protein: Math.round(matchedFood.protein * servings * 10) / 10,
      carbs: Math.round(matchedFood.carbs * servings * 10) / 10,
      fat: Math.round(matchedFood.fat * servings * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal);

    setTimeout(() => {
      setIsLogged(false);
      onBack();
    }, 700);
  };

  const sampleBarcodes = [
    { label: 'Egg', code: '011110001027' },
    { label: 'Chicken', code: '011110001010' },
    { label: 'Whey Protein', code: '748927028669' },
    { label: 'Greek Yogurt', code: '894700010328' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Lookup</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Input Card */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Enter Barcode / UPC Number</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Barcode size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 894700010328"
              placeholderTextColor={theme.colors.textMuted}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              keyboardType="numeric"
              returnKeyType="search"
              onSubmitEditing={() => handleLookupBarcode()}
            />
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => handleLookupBarcode()}
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Search size={16} color={theme.colors.textInverted} />
          </TouchableOpacity>
        </View>

        {/* Quick Sample Chips */}
        <Text style={styles.quickSamplesLabel}>Sample codes in local database:</Text>
        <View style={styles.sampleChipsRow}>
          {sampleBarcodes.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.sampleChip}
              onPress={() => handleSelectQuickSample(item.code)}
            >
              <Text style={styles.sampleChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading state */}
      {searchStatus === 'searching' && (
        <View style={styles.statusBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.statusText}>Searching verified nutrition database...</Text>
        </View>
      )}

      {/* Not Found State */}
      {searchStatus === 'not_found' && (
        <View style={styles.notFoundBox}>
          <AlertTriangle size={20} color={theme.colors.accent} />
          <Text style={styles.notFoundTitle}>Barcode Not Found</Text>
          <Text style={styles.notFoundBody}>
            No match for "{barcodeInput}". You can search for the item by name in the Food Diary tab.
          </Text>
        </View>
      )}

      {/* Found Product Card */}
      {searchStatus === 'found' && matchedFood && (
        <View style={styles.matchCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.matchBadge}>
              <CheckCircle size={14} color={theme.colors.primary} />
              <Text style={styles.matchBadgeText}>Verified Food</Text>
            </View>
            <Text style={styles.upcText}>UPC {matchedFood.barcode || matchedFood.id}</Text>
          </View>

          <View style={styles.productInfo}>
            {matchedFood.brand && (
              <Text style={styles.brandTitle}>{matchedFood.brand}</Text>
            )}
            <Text style={styles.productName}>{matchedFood.name}</Text>
            <Text style={styles.portionSubtitle}>
              {matchedFood.servingSize} ({matchedFood.servingGrams}g)
            </Text>

            <View style={styles.calorieRow}>
              <Text style={styles.calorieNumber}>
                {Math.round(matchedFood.calories * servings)}
              </Text>
              <Text style={styles.calorieUnit}>kcal total</Text>
            </View>
          </View>

          {/* Macro Pill Grid */}
          <View style={styles.macroPillGrid}>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillLabel}>Protein</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.macroProtein }]}>
                {Math.round(matchedFood.protein * servings * 10) / 10}g
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillLabel}>Carbs</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.macroCarbs }]}>
                {Math.round(matchedFood.carbs * servings * 10) / 10}g
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillLabel}>Fat</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.macroFat }]}>
                {Math.round(matchedFood.fat * servings * 10) / 10}g
              </Text>
            </View>
          </View>

          {/* Servings Stepper */}
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Servings</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
                accessibilityLabel="Decrease servings"
              >
                <Minus size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.stepperCountText}>{servings}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setServings((s) => s + 0.5)}
                accessibilityLabel="Increase servings"
              >
                <Plus size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meal Target Chips */}
          <View style={styles.chipsRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[
                  styles.mealChip,
                  selectedMeal === meal && styles.mealChipActive,
                ]}
                onPress={() => setSelectedMeal(meal)}
              >
                <Text
                  style={[
                    styles.mealChipText,
                    selectedMeal === meal && styles.mealChipTextActive,
                  ]}
                >
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryLogBtn, isLogged && styles.primaryLogBtnSuccess]}
            onPress={handleLogProduct}
            activeOpacity={0.85}
          >
            {isLogged ? (
              <>
                <Check size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryLogBtnText}>Logged to Diary</Text>
              </>
            ) : (
              <>
                <Plus size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryLogBtnText}>Log to Diary</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: 14,
    ...theme.shadow.subtle,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSamplesLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  sampleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sampleChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sampleChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  notFoundBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginVertical: 10,
  },
  notFoundTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  notFoundBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  matchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 6,
    ...theme.shadow.subtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  upcText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  productInfo: {
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  portionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  calorieNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  calorieUnit: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  macroPillGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  macroPillVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 10,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 10,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  mealChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingVertical: 7,
    alignItems: 'center',
  },
  mealChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  mealChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  mealChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  primaryLogBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...theme.shadow.subtle,
  },
  primaryLogBtnSuccess: {
    backgroundColor: theme.colors.primaryHover,
  },
  primaryLogBtnText: {
    color: theme.colors.textInverted,
    fontWeight: '600',
    fontSize: 14,
  },
});
