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
  Utensils,
  Check,
  AlertTriangle,
  Info,
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

    // Search local verified database by exact barcode or partial ID match
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
    }, 800);
  };

  // Sample catalog barcodes from database
  const sampleBarcodes = [
    { label: 'Egg', code: '011110001027' },
    { label: 'Chicken', code: '011110001010' },
    { label: 'Whey Protein', code: '748927028669' },
    { label: 'Greek Yogurt', code: '894700010328' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onBack}
          accessibilityLabel="Back to Diary"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Lookup</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <X size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Honest Scanner Status Banner */}
      <View style={styles.noticeBanner}>
        <Info size={18} color={theme.colors.cyan} />
        <View style={{ flex: 1 }}>
          <Text style={styles.noticeTitle}>Camera Scanner Notice</Text>
          <Text style={styles.noticeBody}>
            Live camera barcode scanning requires camera hardware permissions on physical devices. Enter the product UPC barcode below to instantly look up verified nutrition.
          </Text>
        </View>
      </View>

      {/* Manual Barcode Input Card */}
      <View style={styles.inputCard}>
        <Text style={styles.inputCardLabel}>Enter Barcode / UPC Number</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Barcode size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 894700010328 or 011110001027"
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
            accessibilityLabel="Look up barcode"
            accessibilityRole="button"
          >
            <Search size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Sample Chips */}
        <Text style={styles.quickSamplesLabel}>Try sample barcode from database:</Text>
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
          <AlertTriangle size={24} color={theme.colors.amber} />
          <Text style={styles.notFoundTitle}>Barcode Not Found</Text>
          <Text style={styles.notFoundBody}>
            No match for "{barcodeInput}" in the local verified database. Check the number or search for the item by name in the Food Diary tab.
          </Text>
        </View>
      )}

      {/* Found Product Card */}
      {searchStatus === 'found' && matchedFood && (
        <View style={styles.matchCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.matchBadge}>
              <CheckCircle size={15} color={theme.colors.primary} />
              <Text style={styles.matchBadgeText}>Verified Match</Text>
            </View>
            <Text style={styles.upcText}>UPC {matchedFood.barcode || matchedFood.id}</Text>
          </View>

          <View style={styles.productInfo}>
            {matchedFood.brand && (
              <Text style={styles.brandTitle}>{matchedFood.brand.toUpperCase()}</Text>
            )}
            <Text style={styles.productName}>{matchedFood.name}</Text>
            <Text style={styles.portionSubtitle}>
              Serving: {matchedFood.servingSize} ({matchedFood.servingGrams}g)
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
              <Text style={styles.macroPillLabel}>PROTEIN</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.amber }]}>
                {Math.round(matchedFood.protein * servings * 10) / 10}g
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillLabel}>CARBS</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.cyan }]}>
                {Math.round(matchedFood.carbs * servings * 10) / 10}g
              </Text>
            </View>
            <View style={styles.macroPill}>
              <Text style={styles.macroPillLabel}>FAT</Text>
              <Text style={[styles.macroPillVal, { color: theme.colors.pink }]}>
                {Math.round(matchedFood.fat * servings * 10) / 10}g
              </Text>
            </View>
          </View>

          {/* Servings Stepper */}
          <View style={styles.stepperRow}>
            <View style={styles.stepperLeft}>
              <Utensils size={16} color={theme.colors.primary} />
              <Text style={styles.stepperSubLabel}>Servings</Text>
            </View>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
                accessibilityLabel="Decrease servings"
              >
                <Minus size={15} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.stepperCountText}>{servings}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setServings((s) => s + 0.5)}
                accessibilityLabel="Increase servings"
              >
                <Plus size={15} color={theme.colors.primary} />
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

          {/* Primary Confirmation CTA */}
          <TouchableOpacity
            style={[styles.primaryLogBtn, isLogged && styles.primaryLogBtnSuccess]}
            onPress={handleLogProduct}
            activeOpacity={0.85}
          >
            {isLogged ? (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.primaryLogBtnText}>Logged to Diary!</Text>
              </>
            ) : (
              <>
                <Plus size={20} color="#FFFFFF" />
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  noticeBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  noticeBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  inputCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
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
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSamplesLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 14,
    marginBottom: 8,
  },
  sampleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sampleChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
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
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: theme.radius.lg,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  notFoundTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    marginTop: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  upcText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  productInfo: {
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.8,
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
    marginTop: 4,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  calorieNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  calorieUnit: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  macroPillGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroPill: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  macroPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  macroPillVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperSubLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  mealChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  mealChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  mealChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  mealChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  primaryLogBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLogBtnSuccess: {
    backgroundColor: '#059669',
  },
  primaryLogBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
