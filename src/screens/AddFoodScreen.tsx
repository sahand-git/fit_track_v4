import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  X,
  Search,
  Barcode as BarcodeIcon,
  Camera as CameraIcon,
  Sparkles,
  Plus,
  Minus,
  Check,
  Star,
  Copy,
  Utensils,
  Bookmark,
  ChevronDown,
  MoreVertical,
  RotateCcw,
} from 'lucide-react-native';

import { AppText as Text } from '../components/AppText';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { FoodItem, LoggedMeal, MealTemplate, MealType } from '../types';
import { VERIFIED_FOOD_DATABASE, REGIONAL_FOODS } from '../data/foodDatabase';
import { lookupBarcodeWithFallbacks } from '../services/barcodeService';
import {
  analyzeMealImage,
  estimateMealFromText,
  PlateAnalysisResult,
} from '../services/plateAnalysisService';
import { AiReview } from '../components/addfood/AiReview';
import { FoodThumbnail } from '../components/FoodThumbnail';
import { RequestFoodModal } from '../components/RequestFoodModal';
import { getTodayDateString } from '../utils/dateUtils';
import { getPreviousDayString } from '../utils/streak';
import {
  loadRecentFoods,
  addRecentFood,
  loadFavoriteFoods,
  toggleFavoriteFood,
  loadCustomFoods,
  addCustomFood,
  loadBarcodeCache,
  copyYesterdayMealType,
  getYesterdayMealsPreview,
  YesterdayMealsPreview,
  loadDailyLog,
  loadFrequentFoods,
  loadMealTemplates,
} from '../storage/storage';
import { getFoodSourceLabel } from '../utils/foodSource';
import { createUniqueId } from '../utils/idUtils';
import { isReducedMotion } from '../utils/motion';
import { FoodCategory } from '../utils/foodCategories';
import {
  addMealToSession,
  calculatePortionNutrition,
  createInitialSessionState,
  filterAndRankFoods,
  FoodFilterType,
  getMealTypeLabel,
  SessionState,
  undoLastSessionMeal,
} from './AddFoodScreenCore';

export interface AddFoodScreenProps {
  date: string;
  mealType?: MealType;
  initialTab?: 'search' | 'photo' | 'describe';
  initialScanBarcode?: boolean;
  onClose: () => void;
  onAddMeal: (meal: LoggedMeal, targetDate: string) => void;
  onCopyYesterdayMeals?: (targetDate: string) => Promise<void>;
}

const CATEGORIES: { label: string; cat: FoodCategory | 'All'; emoji: string }[] = [
  { label: 'All', cat: 'All', emoji: '🍽️' },
  { label: 'Meat', cat: 'Meat', emoji: '🥩' },
  { label: 'Fish & Seafood', cat: 'Fish & Seafood', emoji: '🐟' },
  { label: 'Eggs & Dairy', cat: 'Eggs & Dairy', emoji: '🥛' },
  { label: 'Grains & Bread', cat: 'Grains & Bread', emoji: '🍞' },
  { label: 'Fruit', cat: 'Fruit', emoji: '🍎' },
  { label: 'Vegetables', cat: 'Vegetables', emoji: '🥦' },
  { label: 'Beans & Lentils', cat: 'Beans & Lentils', emoji: '🫘' },
  { label: 'Nuts & Seeds', cat: 'Nuts & Seeds', emoji: '🥜' },
  { label: 'Snacks & Protein', cat: 'Snacks & Protein', emoji: '🍫' },
];

function getDefaultMealType(): MealType {
  const currentHour = new Date().getHours();
  if (currentHour < 11) return 'breakfast';
  if (currentHour < 15) return 'lunch';
  if (currentHour < 18) return 'snack';
  return 'dinner';
}

export const AddFoodScreen: React.FC<AddFoodScreenProps> = ({
  date,
  mealType: initialMealType,
  initialTab = 'search',
  initialScanBarcode = false,
  onClose,
  onAddMeal,
}) => {
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const t = useCallback((str: string) => translate(language, str), [language]);

  // Core navigation & meal selector
  const [selectedMeal, setSelectedMeal] = useState<MealType>(initialMealType || getDefaultMealType());
  const [mealDropdownOpen, setMealDropdownOpen] = useState(false);

  // Search & Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FoodFilterType>('all');
  const [activeCategory, setActiveCategory] = useState<FoodCategory | 'All'>('All');

  // Loaded collections
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [barcodeCache, setBarcodeCache] = useState<FoodItem[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);

  // Session state for multi-item logging
  const [sessionState, setSessionState] = useState<SessionState>(createInitialSessionState);

  // Portion Picker Drawer state
  const [selectedFoodForPortion, setSelectedFoodForPortion] = useState<FoodItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [servingsCount, setServingsCount] = useState(1);

  // Modals & Secondary Sheets
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestModalInitialName, setRequestModalInitialName] = useState('');
  const [requestModalInitialBarcode, setRequestModalInitialBarcode] = useState('');
  const [manualBarcodeModalVisible, setManualBarcodeModalVisible] = useState(false);

  // Barcode & Camera state
  const [, requestCameraPermission] = useCameraPermissions();
  const [isScanningBarcode, setIsScanningBarcode] = useState(initialScanBarcode);
  const [manualBarcode, setManualBarcode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // AI Photo state
  const [photoModalVisible, setPhotoModalVisible] = useState(initialTab === 'photo');
  const [, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PlateAnalysisResult | null>(null);

  // AI Describe state
  const [describeModalVisible, setDescribeModalVisible] = useState(initialTab === 'describe');
  const [describeText, setDescribeText] = useState('');
  const [describeLoading, setDescribeLoading] = useState(false);
  const [describeError, setDescribeError] = useState<string | null>(null);
  const [describeResult, setDescribeResult] = useState<PlateAnalysisResult | null>(null);

  // Custom Food Form State
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('');
  const [customServingGrams, setCustomServingGrams] = useState(100);
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Copy Yesterday State
  const [copyMealTypeLoading, setCopyMealTypeLoading] = useState(false);
  const [yesterdayMealTypePreview, setYesterdayMealTypePreview] = useState<YesterdayMealsPreview>({ count: 0, calories: 0 });

  const isFuture = date > getTodayDateString();

  // Load all food collections on mount
  const loadCollections = useCallback(() => {
    let isMounted = true;
    Promise.all([
      loadRecentFoods(),
      loadFavoriteFoods(),
      loadCustomFoods(),
      loadBarcodeCache(),
      loadFrequentFoods(),
      loadMealTemplates(),
      loadDailyLog(date),
    ])
      .then(([recents, favs, customs, barCodes, freqs, tmpls]) => {
        if (isMounted) {
          setRecentFoods(recents);
          setFavoriteFoods(favs);
          setCustomFoods(customs);
          setBarcodeCache(barCodes);
          setFrequentFoods(freqs);
          setMealTemplates(tmpls);
        }
      })
      .catch((e) => {
        console.warn('Failed to load food collections:', e);
      });

    return () => {
      isMounted = false;
    };
  }, [date]);

  useEffect(() => {
    return loadCollections();
  }, [loadCollections]);

  // Load yesterday preview for selected meal
  useEffect(() => {
    let isMounted = true;
    const prevDate = getPreviousDayString(date);
    getYesterdayMealsPreview(prevDate, selectedMeal).then((preview) => {
      if (isMounted) setYesterdayMealTypePreview(preview);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [date, selectedMeal]);

  // Combined master catalog
  const allFoods = useMemo(() => {
    const combined = [...customFoods, ...recentFoods, ...barcodeCache, ...VERIFIED_FOOD_DATABASE, ...REGIONAL_FOODS];
    const seen = new Set<string>();
    return combined.filter((f) => {
      if (!f || !f.id || seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [customFoods, recentFoods, barcodeCache]);

  // Filtered & ranked food list
  const filteredFoods = useMemo(() => {
    return filterAndRankFoods({
      allFoods,
      recentFoods,
      frequentFoods,
      favoriteFoods,
      customFoods,
      barcodeCache,
      searchQuery,
      activeFilter,
      activeCategory,
    });
  }, [allFoods, recentFoods, frequentFoods, favoriteFoods, customFoods, barcodeCache, searchQuery, activeFilter, activeCategory]);

  // Handle open portion picker for item
  const handleSelectFoodRow = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedFoodForPortion(food);
    setSelectedVariantId(food.variants?.[0]?.id ?? null);
    setServingsCount(1);
  };

  // Active variant resolution for portion picker
  const activeVariant = useMemo(() => {
    if (!selectedFoodForPortion?.variants || selectedFoodForPortion.variants.length === 0) return null;
    return selectedFoodForPortion.variants.find((v) => v.id === selectedVariantId) ?? selectedFoodForPortion.variants[0];
  }, [selectedFoodForPortion, selectedVariantId]);

  // Portion nutrition calculation
  const portionNutrition = useMemo(() => {
    if (!selectedFoodForPortion) return null;
    return calculatePortionNutrition(selectedFoodForPortion, activeVariant, servingsCount);
  }, [selectedFoodForPortion, activeVariant, servingsCount]);

  // Add meal action
  const handleConfirmAddMeal = () => {
    if (!selectedFoodForPortion || !portionNutrition || isFuture) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const effectiveGramsPerUnit = activeVariant?.servingGrams ?? (selectedFoodForPortion.gramsPerUnit ?? selectedFoodForPortion.servingGrams);
    const totalGrams = Math.round(effectiveGramsPerUnit * servingsCount);

    const meal: LoggedMeal = {
      id: createUniqueId('meal'),
      foodId: selectedFoodForPortion.id,
      name: selectedFoodForPortion.name,
      mealType: selectedMeal,
      servings: servingsCount,
      servingSize: portionNutrition.displayServing,
      servingGrams: totalGrams,
      calories: portionNutrition.calories,
      protein: portionNutrition.protein,
      carbs: portionNutrition.carbs,
      fat: portionNutrition.fat,
      fiber: selectedFoodForPortion.fiber ? Math.round(selectedFoodForPortion.fiber * servingsCount * 10) / 10 : undefined,
      sugar: selectedFoodForPortion.sugar ? Math.round(selectedFoodForPortion.sugar * servingsCount * 10) / 10 : undefined,
      sodium: selectedFoodForPortion.sodium,
      potassium: selectedFoodForPortion.potassium,
      calcium: selectedFoodForPortion.calcium,
      iron: selectedFoodForPortion.iron,
      vitaminC: selectedFoodForPortion.vitaminC,
      vitaminA: selectedFoodForPortion.vitaminA,
      vitaminD: selectedFoodForPortion.vitaminD,
      vitaminB12: selectedFoodForPortion.vitaminB12,
      magnesium: selectedFoodForPortion.magnesium,
      zinc: selectedFoodForPortion.zinc,
      isEstimate: selectedFoodForPortion.isEstimate ?? selectedFoodForPortion.recipeEstimate,
      source: selectedFoodForPortion.source ?? (selectedFoodForPortion.recipeEstimate ? 'regional_culinary_estimate' : 'verified_database'),
      barcode: selectedFoodForPortion.barcode,
      selectedVariantId: activeVariant?.id,
      variantName: activeVariant?.name,
      recipeEstimate: selectedFoodForPortion.recipeEstimate,
      imageUrl: selectedFoodForPortion.imageUrl,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal, date);
    setSessionState((prev) => addMealToSession(prev, meal, selectedFoodForPortion));

    // Save to recents
    addRecentFood(selectedFoodForPortion)
      .then((updated) => setRecentFoods(updated))
      .catch((e) => console.warn('Failed to save recent food:', e));

    setSelectedFoodForPortion(null);
  };

  // Undo last session item
  const handleUndoLastItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const { removedMealId, updatedState } = undoLastSessionMeal(sessionState);
    if (removedMealId) {
      setSessionState(updatedState);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await toggleFavoriteFood(food);
      setFavoriteFoods(res.favorites);
    } catch (e) {
      console.warn('Failed to toggle favorite:', e);
    }
  };

  // Live Barcode Scan Handlers
  const handleStartLiveBarcodeScan = async () => {
    if (Platform.OS === 'web') {
      setManualBarcodeModalVisible(true);
      return;
    }
    const perm = await requestCameraPermission();
    if (!perm.granted) {
      Alert.alert(t('Camera Access'), t('Live barcode scanning requires camera permission. You can still look up any barcode manually.'));
      setManualBarcodeModalVisible(true);
      return;
    }
    setIsScanningBarcode(true);
  };

  const handlePerformBarcodeLookup = async (code: string) => {
    if (!code || barcodeLoading) return;
    setIsScanningBarcode(false);
    setBarcodeLoading(true);
    setBarcodeError(null);
    try {
      const found = await lookupBarcodeWithFallbacks(code.trim());
      if (found) {
        handleSelectFoodRow(found);
      } else {
        setBarcodeError(t('Could not find food for this barcode.'));
        setRequestModalInitialBarcode(code.trim());
        setManualBarcodeModalVisible(true);
      }
    } catch {
      setBarcodeError(t('Could not find food for this barcode.'));
      setManualBarcodeModalVisible(true);
    } finally {
      setBarcodeLoading(false);
    }
  };

  // Copy yesterday's meal
  const handleCopyYesterday = async () => {
    if (isFuture || copyMealTypeLoading) return;
    setCopyMealTypeLoading(true);
    try {
      const res = await copyYesterdayMealType(date, selectedMeal);
      if (res.addedCount > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        res.meals.forEach((m) => onAddMeal(m, date));
        setMoreActionsVisible(false);
        Alert.alert(t('Meals copied from yesterday.'), `${res.addedCount} ${t('Items added')}`);
      } else {
        Alert.alert(t('Copy yesterday'), t('Nothing new to copy.'));
      }
    } catch (e) {
      console.warn('Copy yesterday failed:', e);
      Alert.alert(t('Error'), t('Failed to save meal.'));
    } finally {
      setCopyMealTypeLoading(false);
    }
  };

  // Custom food save
  const handleSaveCustomFood = async () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      setCustomError(t('Please enter a valid food name.'));
      return;
    }
    const cal = parseFloat(customCalories);
    const p = parseFloat(customProtein) || 0;
    const c = parseFloat(customCarbs) || 0;
    const f = parseFloat(customFat) || 0;
    if (isNaN(cal) || cal < 0) {
      setCustomError(t('Please enter valid numeric values for calories and macronutrients.'));
      return;
    }

    const newFood: FoodItem = {
      id: createUniqueId('food_custom'),
      name: trimmed,
      servingSize: customServing.trim() || '1 serving (100g)',
      servingGrams: customServingGrams > 0 ? customServingGrams : 100,
      calories: Math.round(cal),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      source: 'custom',
    };

    try {
      const updated = await addCustomFood(newFood);
      setCustomFoods(updated);
      setCustomModalVisible(false);
      setCustomName('');
      setCustomCalories('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setCustomError(null);
      handleSelectFoodRow(newFood);
    } catch {
      setCustomError(t('Failed to save custom food.'));
    }
  };

  // AI Photo Pick & Analyze
  const handlePickPhoto = async (fromCamera: boolean) => {
    setPhotoError(null);
    setPhotoResult(null);

    let res: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('Camera Access'), t('Camera permission is required to photograph your meal.'));
        return;
      }
      res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('Photo Access'), t('Gallery access is required to choose a meal photo.'));
        return;
      }
      res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.6, base64: true });
    }

    if (res.canceled || !res.assets || !res.assets[0]?.base64) {
      if (res.assets && res.assets[0] && !res.assets[0].base64) {
        setPhotoError(t('Could not process photo data. Please try again.'));
      }
      return;
    }
    const asset = res.assets[0];
    const base64Data = asset.base64;
    if (!base64Data) {
      setPhotoError(t('Could not process photo data. Please try again.'));
      return;
    }
    setPhotoUri(asset.uri);
    setPhotoLoading(true);

    try {
      const analysis = await analyzeMealImage(base64Data);
      setPhotoResult(analysis);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setPhotoError(err?.message || t('Failed to analyze meal photo.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setPhotoLoading(false);
    }
  };

  // AI Describe Estimate
  const handleEstimateDescribe = async () => {
    const trimmed = describeText.trim();
    if (!trimmed || describeLoading) return;
    setDescribeLoading(true);
    setDescribeError(null);
    try {
      const analysis = await estimateMealFromText(trimmed);
      setDescribeResult(analysis);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setDescribeError(err?.message || t('Failed to estimate meal with AI.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setDescribeLoading(false);
    }
  };

  // Render food row item
  const renderFoodItem = useCallback(({ item }: { item: FoodItem }) => {
    const isFav = favoriteFoods.some((f) => f.id === item.id);
    const sourceLabel = getFoodSourceLabel(item.source, t);

    return (
      <TouchableOpacity
        style={styles.foodRow}
        onPress={() => handleSelectFoodRow(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.calories} calories`}
      >
        <FoodThumbnail
          name={item.name}
          category={item.category}
          imageUrl={item.imageUrl}
          size="small"
          style={styles.thumbnail}
        />
        <View style={styles.foodInfoCol}>
          <View style={styles.foodTitleRow}>
            <Text style={styles.foodName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            <Text style={styles.foodCalories}>{item.calories} kcal</Text>
          </View>
          <View style={styles.foodMetaRow}>
            <Text style={styles.foodServing} numberOfLines={1}>
              {item.servingSize || '1 serving'}
            </Text>
            <Text style={styles.macroDots}>•</Text>
            <Text style={styles.macroPreview}>
              P {item.protein}g · C {item.carbs}g · F {item.fat}g
            </Text>
            {sourceLabel ? (
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{sourceLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.favButton}
          onPress={() => handleToggleFavorite(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={isFav ? t('Remove from favorites') : t('Add to favorites')}
        >
          <Star
            size={18}
            color={isFav ? theme.colors.warning : theme.colors.textMuted}
            fill={isFav ? theme.colors.warning : 'none'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [favoriteFoods, t]);

  const mealOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 1. COMPACT TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>{t('Add food')}</Text>

        {/* Compact Meal Selector Pill */}
        <TouchableOpacity
          style={styles.mealSelectorPill}
          onPress={() => setMealDropdownOpen((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={`${t('Select meal')}: ${t(getMealTypeLabel(selectedMeal))}`}
        >
          <Text style={styles.mealSelectorText}>{t(getMealTypeLabel(selectedMeal))}</Text>
          <ChevronDown size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Meal Dropdown Modal / Popover */}
      {mealDropdownOpen && (
        <Modal
          transparent
          visible={mealDropdownOpen}
          animationType="fade"
          onRequestClose={() => setMealDropdownOpen(false)}
        >
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setMealDropdownOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('Close')}
          >
            <View style={[styles.dropdownMenu, { top: insets.top + 52 }]}>
              {mealOptions.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.dropdownItem, selectedMeal === m && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedMeal(m);
                    setMealDropdownOpen(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(getMealTypeLabel(m))}
                >
                  <Text style={[styles.dropdownItemText, selectedMeal === m && styles.dropdownItemTextActive]}>
                    {t(getMealTypeLabel(m))}
                  </Text>
                  {selectedMeal === m && <Check size={16} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 2. SEARCH BAR + COMPACT ACTION ICONS */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search foods...')}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('Clear search')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Barcode Quick Icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleStartLiveBarcodeScan}
          accessibilityRole="button"
          accessibilityLabel={t('Scan barcode')}
        >
          <BarcodeIcon size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* AI Camera Photo Icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setPhotoModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Analyze meal photo')}
        >
          <CameraIcon size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* AI Describe Sparkles Icon */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setDescribeModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('AI meal estimate')}
        >
          <Sparkles size={20} color={theme.colors.accent} />
        </TouchableOpacity>

        {/* More Options Overflow Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMoreActionsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Advanced actions')}
        >
          <MoreVertical size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 3. ROW 1: PRIMARY FILTER PILLS */}
      <View style={styles.filterRowContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'recent', 'frequent', 'favorites', 'regional', 'custom', 'scanned'] as FoodFilterType[]).map((f) => {
            const isActive = activeFilter === f;
            const filterLabel = f === 'regional' ? t('Iraqi & Kurdish') : t(f.charAt(0).toUpperCase() + f.slice(1));
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  setActiveFilter(f);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                accessibilityRole="button"
                accessibilityLabel={filterLabel}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {filterLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. ROW 2: SLIM CATEGORY PILLS */}
      <View style={styles.categoryRowContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((item) => {
            const isActive = activeCategory === item.cat;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => {
                  setActiveCategory(item.cat);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                accessibilityRole="button"
                accessibilityLabel={t(item.label)}
              >
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {t(item.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. VIRTUALIZED FOOD LIST (occupies >= 60% of viewport) */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredFoods}
          keyExtractor={(item) => item.id}
          renderItem={renderFoodItem}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: sessionState.addedItems.length > 0 ? insets.bottom + 90 : insets.bottom + 24 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t('No foods found')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('Try a different search or add a custom food')}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => setCustomModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('Quick Add')}
              >
                <Plus size={16} color={theme.colors.textInverted} />
                <Text style={styles.emptyActionButtonText}>{t('Quick Add')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* 6. FLOATING SESSION TRAY (Appears only when >= 1 item added) */}
      {sessionState.addedItems.length > 0 && (
        <Animated.View
          entering={isReducedMotion() ? FadeIn : SlideInDown.springify().damping(18)}
          exiting={isReducedMotion() ? FadeOut : SlideOutDown}
          style={[styles.sessionTray, { bottom: Math.max(16, insets.bottom + 12) }]}
        >
          <View style={styles.sessionTrayInfo}>
            <View style={styles.sessionCountBadge}>
              <Text style={styles.sessionCountText}>{sessionState.addedItems.length}</Text>
            </View>
            <View>
              <Text style={styles.sessionTrayTitle}>{t('Items added')}</Text>
              <Text style={styles.sessionTrayKcal}>{sessionState.totalCalories} kcal</Text>
            </View>
          </View>

          <View style={styles.sessionTrayActions}>
            <TouchableOpacity
              style={styles.sessionUndoButton}
              onPress={handleUndoLastItem}
              accessibilityRole="button"
              accessibilityLabel={t('Undo')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={16} color={theme.colors.textPrimary} />
              <Text style={styles.sessionUndoText}>{t('Undo')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sessionDoneButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('Done')}
            >
              <Text style={styles.sessionDoneText}>{t('Done')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* 7. PORTION PICKER STEP (Focused slide-up drawer / modal) */}
      {selectedFoodForPortion && portionNutrition && (
        <Modal
          visible={Boolean(selectedFoodForPortion)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedFoodForPortion(null)}
        >
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardAvoid}
            >
              <View style={[styles.portionDrawer, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
                {/* Header */}
                <View style={styles.portionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portionTitle} numberOfLines={2}>
                      {selectedFoodForPortion.name}
                    </Text>
                    <Text style={styles.portionSubtitle}>
                      {selectedFoodForPortion.servingSize || '1 serving'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.portionCloseBtn}
                    onPress={() => setSelectedFoodForPortion(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('Close')}
                  >
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Variants if present */}
                {selectedFoodForPortion.variants && selectedFoodForPortion.variants.length > 0 && (
                  <View style={styles.variantContainer}>
                    <Text style={styles.sectionLabel}>{t('Serving size')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
                      {selectedFoodForPortion.variants.map((v) => {
                        const isVarActive = selectedVariantId === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.variantChip, isVarActive && styles.variantChipActive]}
                            onPress={() => {
                              setSelectedVariantId(v.id);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={v.name}
                          >
                            <Text style={[styles.variantChipText, isVarActive && styles.variantChipTextActive]}>
                              {v.name} ({v.calories} kcal)
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Stepper for Servings */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.sectionLabel}>{t('Servings:')}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        setServingsCount((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('Decrease servings')}
                    >
                      <Minus size={20} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.stepperInput}
                      value={String(servingsCount)}
                      keyboardType="decimal-pad"
                      onChangeText={(val) => {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num > 0) setServingsCount(num);
                        else if (val === '') setServingsCount(1);
                      }}
                    />

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        setServingsCount((prev) => Math.round((prev + 0.25) * 100) / 100);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('Increase servings')}
                    >
                      <Plus size={20} color={theme.colors.primary} />
                    </TouchableOpacity>

                    {/* Quick presets */}
                    {[0.5, 1, 1.5, 2].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.presetBtn, servingsCount === preset && styles.presetBtnActive]}
                        onPress={() => {
                          setServingsCount(preset);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${preset} ${t('servings')}`}
                      >
                        <Text style={[styles.presetBtnText, servingsCount === preset && styles.presetBtnTextActive]}>
                          {preset}×
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Live Macro Breakdown Cards */}
                <View style={styles.nutritionPreviewCard}>
                  <View style={styles.nutritionTotalCal}>
                    <Text style={styles.portionTotalCalNum}>{portionNutrition.calories}</Text>
                    <Text style={styles.portionTotalCalLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutritionPillsRow}>
                    <View style={styles.portionMacroItem}>
                      <Text style={styles.portionMacroLabel}>{t('Protein')}</Text>
                      <Text style={styles.portionMacroVal}>{portionNutrition.protein}g</Text>
                    </View>
                    <View style={styles.portionMacroItem}>
                      <Text style={styles.portionMacroLabel}>{t('Carbs')}</Text>
                      <Text style={styles.portionMacroVal}>{portionNutrition.carbs}g</Text>
                    </View>
                    <View style={styles.portionMacroItem}>
                      <Text style={styles.portionMacroLabel}>{t('Fat')}</Text>
                      <Text style={styles.portionMacroVal}>{portionNutrition.fat}g</Text>
                    </View>
                  </View>
                </View>

                {/* Sticky 56dp Primary Button */}
                <TouchableOpacity
                  style={styles.primaryAddBtn}
                  onPress={handleConfirmAddMeal}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Add food to')} ${t(getMealTypeLabel(selectedMeal))}`}
                >
                  <Text style={styles.primaryAddBtnText}>
                    {t('Add food to')} {t(getMealTypeLabel(selectedMeal))} ({portionNutrition.calories} kcal)
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {/* 8. MORE ACTIONS MODAL */}
      <Modal
        visible={moreActionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreActionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoreActionsVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <View style={[styles.moreActionsSheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.moreActionsHeader}>
              <Text style={styles.moreActionsTitle}>{t('Advanced actions')}</Text>
              <TouchableOpacity
                onPress={() => setMoreActionsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Add Custom Food */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={() => {
                setMoreActionsVisible(false);
                setCustomModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Quick Add')}
            >
              <View style={styles.moreActionIconBg}>
                <Plus size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionRowTitle}>{t('Quick Add')}</Text>
                <Text style={styles.moreActionRowSub}>{t('Create a custom food entry with macros')}</Text>
              </View>
            </TouchableOpacity>

            {/* Copy Yesterday's Meal */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={handleCopyYesterday}
              disabled={copyMealTypeLoading || isFuture}
              accessibilityRole="button"
              accessibilityLabel={t('Copy yesterday')}
            >
              <View style={styles.moreActionIconBg}>
                <Copy size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionRowTitle}>
                  {t('Copy yesterday')} ({yesterdayMealTypePreview.count} items, {yesterdayMealTypePreview.calories} kcal)
                </Text>
                <Text style={styles.moreActionRowSub}>{t('Add all meals logged yesterday for this slot')}</Text>
              </View>
            </TouchableOpacity>

            {/* Saved Templates */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={() => {
                setMoreActionsVisible(false);
                setTemplateModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Templates')}
            >
              <View style={styles.moreActionIconBg}>
                <Bookmark size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionRowTitle}>{t('Templates')} ({mealTemplates.length})</Text>
                <Text style={styles.moreActionRowSub}>{t('Manage and log reusable meal combinations')}</Text>
              </View>
            </TouchableOpacity>

            {/* Enter Barcode Manually */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={() => {
                setMoreActionsVisible(false);
                setManualBarcodeModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Enter barcode manually')}
            >
              <View style={styles.moreActionIconBg}>
                <BarcodeIcon size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionRowTitle}>{t('Enter barcode manually')}</Text>
                <Text style={styles.moreActionRowSub}>{t('Look up any product by digit code')}</Text>
              </View>
            </TouchableOpacity>

            {/* Request Food */}
            <TouchableOpacity
              style={styles.moreActionRow}
              onPress={() => {
                setMoreActionsVisible(false);
                setRequestModalInitialName(searchQuery.trim());
                setRequestModalInitialBarcode('');
                setRequestModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Request a food')}
            >
              <View style={styles.moreActionIconBg}>
                <Utensils size={18} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moreActionRowTitle}>{t('Request a food')}</Text>
                <Text style={styles.moreActionRowSub}>{t("Can't find what you are looking for?")}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 9. LIVE BARCODE SCANNER OVERLAY */}
      {isScanningBarcode && (
        <Modal
          visible={isScanningBarcode}
          animationType="slide"
          onRequestClose={() => setIsScanningBarcode(false)}
        >
          <View style={styles.cameraFullContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
              onBarcodeScanned={({ data }) => {
                if (data) handlePerformBarcodeLookup(data);
              }}
            >
              <View style={styles.cameraOverlay}>
                <TouchableOpacity
                  style={[styles.cameraCloseBtn, { top: insets.top + 16 }]}
                  onPress={() => setIsScanningBarcode(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                >
                  <X size={24} color={theme.colors.textInverted} />
                </TouchableOpacity>

                <View style={styles.cameraReticle} />
                <Text style={styles.cameraReticleText}>{t('Scan barcode')}</Text>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {/* 10. AI PHOTO MODAL */}
      <Modal
        visible={photoModalVisible}
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={[styles.aiModalContainer, { paddingTop: insets.top }]}>
          <View style={styles.aiModalHeader}>
            <TouchableOpacity
              onPress={() => setPhotoModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <X size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>{t('Analyze meal photo')}</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={styles.aiModalContent}>
            {photoResult ? (
              <AiReview
                result={photoResult}
                mealType={selectedMeal}
                targetDate={date}
                onLogItem={(meal: LoggedMeal) => {
                  onAddMeal(meal, date);
                  setSessionState((prev) => addMealToSession(prev, meal, {
                    id: meal.foodId || meal.id,
                    name: meal.name,
                    servingSize: meal.servingSize,
                    servingGrams: meal.servingGrams || 100,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fat: meal.fat,
                  }));
                }}
                onLogAll={(meals: LoggedMeal[]) => {
                  meals.forEach((meal) => {
                    onAddMeal(meal, date);
                    setSessionState((prev) => addMealToSession(prev, meal, {
                      id: meal.foodId || meal.id,
                      name: meal.name,
                      servingSize: meal.servingSize,
                      servingGrams: meal.servingGrams || 100,
                      calories: meal.calories,
                      protein: meal.protein,
                      carbs: meal.carbs,
                      fat: meal.fat,
                    }));
                  });
                  setPhotoModalVisible(false);
                  setPhotoResult(null);
                }}
              />
            ) : (
              <View style={styles.aiPhotoCard}>
                <Text style={styles.aiCardDesc}>
                  {t('Photograph your plate to get an instant macronutrient estimate.')}
                </Text>
                <View style={styles.aiButtonRow}>
                  <TouchableOpacity
                    style={styles.aiPrimaryBtn}
                    onPress={() => handlePickPhoto(true)}
                    disabled={photoLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('Take photo')}
                  >
                    <CameraIcon size={20} color={theme.colors.textInverted} />
                    <Text style={styles.aiPrimaryBtnText}>{t('Take photo')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.aiSecondaryBtn}
                    onPress={() => handlePickPhoto(false)}
                    disabled={photoLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('Choose from gallery')}
                  >
                    <Text style={styles.aiSecondaryBtnText}>{t('Choose from gallery')}</Text>
                  </TouchableOpacity>
                </View>

                {photoLoading && (
                  <View style={styles.aiLoadingBox}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.aiLoadingText}>{t('Analyzing meal photo with Gemini...')}</Text>
                  </View>
                )}

                {photoError && (
                  <Text style={styles.aiErrorText}>{photoError}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* 11. AI DESCRIBE MODAL */}
      <Modal
        visible={describeModalVisible}
        animationType="slide"
        onRequestClose={() => setDescribeModalVisible(false)}
      >
        <View style={[styles.aiModalContainer, { paddingTop: insets.top }]}>
          <View style={styles.aiModalHeader}>
            <TouchableOpacity
              onPress={() => setDescribeModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <X size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>{t('AI meal estimate')}</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={styles.aiModalContent}>
            {describeResult ? (
              <AiReview
                result={describeResult}
                mealType={selectedMeal}
                targetDate={date}
                onLogItem={(meal: LoggedMeal) => {
                  onAddMeal(meal, date);
                  setSessionState((prev) => addMealToSession(prev, meal, {
                    id: meal.foodId || meal.id,
                    name: meal.name,
                    servingSize: meal.servingSize,
                    servingGrams: meal.servingGrams || 100,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fat: meal.fat,
                  }));
                }}
                onLogAll={(meals: LoggedMeal[]) => {
                  meals.forEach((meal) => {
                    onAddMeal(meal, date);
                    setSessionState((prev) => addMealToSession(prev, meal, {
                      id: meal.foodId || meal.id,
                      name: meal.name,
                      servingSize: meal.servingSize,
                      servingGrams: meal.servingGrams || 100,
                      calories: meal.calories,
                      protein: meal.protein,
                      carbs: meal.carbs,
                      fat: meal.fat,
                    }));
                  });
                  setDescribeModalVisible(false);
                  setDescribeResult(null);
                }}
              />
            ) : (
              <View style={styles.aiPhotoCard}>
                <Text style={styles.aiCardDesc}>
                  {t('Describe what you ate in natural language (e.g. "2 boiled eggs and half an avocado with toast").')}
                </Text>
                <TextInput
                  style={styles.describeInput}
                  multiline
                  numberOfLines={4}
                  placeholder={t('Enter meal description...')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={describeText}
                  onChangeText={setDescribeText}
                />
                <TouchableOpacity
                  style={styles.aiPrimaryBtn}
                  onPress={handleEstimateDescribe}
                  disabled={describeLoading || !describeText.trim()}
                  accessibilityRole="button"
                  accessibilityLabel={t('AI meal estimate')}
                >
                  {describeLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverted} />
                  ) : (
                    <>
                      <Sparkles size={18} color={theme.colors.textInverted} />
                      <Text style={styles.aiPrimaryBtnText}>{t('AI meal estimate')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {describeError && (
                  <Text style={styles.aiErrorText}>{describeError}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* 12. MANUAL BARCODE MODAL */}
      <Modal
        visible={manualBarcodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualBarcodeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setManualBarcodeModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <View style={[styles.portionDrawer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.portionHeader}>
              <Text style={styles.portionTitle}>{t('Enter Barcode (UPC / EAN)')}</Text>
              <TouchableOpacity
                onPress={() => setManualBarcodeModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.manualInput}
              placeholder="e.g. 5000112546415"
              placeholderTextColor={theme.colors.textMuted}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="number-pad"
            />

            {barcodeError && <Text style={styles.errorText}>{barcodeError}</Text>}

            <TouchableOpacity
              style={styles.primaryAddBtn}
              onPress={() => {
                setManualBarcodeModalVisible(false);
                handlePerformBarcodeLookup(manualBarcode.trim());
              }}
              disabled={barcodeLoading || !manualBarcode.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('Search')}
            >
              {barcodeLoading ? (
                <ActivityIndicator size="small" color={theme.colors.textInverted} />
              ) : (
                <Text style={styles.primaryAddBtnText}>{t('Search')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 13. QUICK ADD CUSTOM FOOD MODAL */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.portionDrawer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.portionHeader}>
              <Text style={styles.portionTitle}>{t('Quick Add')}</Text>
              <TouchableOpacity
                onPress={() => setCustomModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>{t('Food name')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('e.g. Homemade lentil soup')}
                placeholderTextColor={theme.colors.textMuted}
                value={customName}
                onChangeText={setCustomName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Serving description (e.g. 1 bowl, 100g)')}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={t('Serving size')}
                    placeholderTextColor={theme.colors.textMuted}
                    value={customServing}
                    onChangeText={setCustomServing}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.inputLabel}>{t('Serving size')} (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="100"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={String(customServingGrams)}
                    onChangeText={(val) => setCustomServingGrams(parseFloat(val) || 100)}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Calories')}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="250"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Protein')} (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="15"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Carbs')} (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="30"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('Fat')} (g)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="6"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={customFat}
                    onChangeText={setCustomFat}
                  />
                </View>
              </View>

              {customError && <Text style={styles.errorText}>{customError}</Text>}
            </ScrollView>

            <TouchableOpacity
              style={styles.primaryAddBtn}
              onPress={handleSaveCustomFood}
              accessibilityRole="button"
              accessibilityLabel={t('Save and add')}
            >
              <Text style={styles.primaryAddBtnText}>{t('Save and add')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 14. TEMPLATES MODAL */}
      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.portionDrawer, { paddingBottom: insets.bottom + 20, maxHeight: '80%' }]}>
            <View style={styles.portionHeader}>
              <Text style={styles.portionTitle}>{t('Meal Templates')}</Text>
              <TouchableOpacity
                onPress={() => setTemplateModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={mealTemplates}
              keyExtractor={(tmpl) => tmpl.id}
              renderItem={({ item }) => (
                <View style={styles.templateCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{item.name}</Text>
                    <Text style={styles.templateSub}>
                      {item.items.length} items · {item.totalCalories} kcal
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.templateAddBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Add')} ${item.name}`}
                    onPress={() => {
                      item.items.forEach((mealItem) => {
                        const meal: LoggedMeal = {
                          id: createUniqueId('meal'),
                          foodId: createUniqueId('food_tmpl'),
                          name: mealItem.name,
                          mealType: selectedMeal,
                          servings: mealItem.servings,
                          servingSize: mealItem.servingSize,
                          servingGrams: mealItem.servingGrams || 100,
                          calories: mealItem.calories,
                          protein: mealItem.protein,
                          carbs: mealItem.carbs,
                          fat: mealItem.fat,
                          timestamp: new Date().toISOString(),
                        };
                        onAddMeal(meal, date);
                        setSessionState((prev) => addMealToSession(prev, meal, {
                          id: meal.foodId || meal.id,
                          name: meal.name,
                          servingSize: meal.servingSize,
                          servingGrams: meal.servingGrams,
                          calories: meal.calories,
                          protein: meal.protein,
                          carbs: meal.carbs,
                          fat: meal.fat,
                        }));
                      });
                      setTemplateModalVisible(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    }}
                  >
                    <Text style={styles.templateAddBtnText}>{t('Add')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptySubtitle}>{t('No saved meal templates.')}</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* 15. REQUEST FOOD MODAL */}
      <RequestFoodModal
        visible={requestModalVisible}
        initialFoodName={requestModalInitialName}
        initialBarcode={requestModalInitialBarcode}
        onClose={() => setRequestModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.textPrimary,
  },
  mealSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  mealSelectorText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: theme.typography.captionMedium.fontWeight,
    color: theme.colors.primary,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
  },
  dropdownMenu: {
    position: 'absolute',
    right: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 160,
    ...theme.shadow.floating,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRowContainer: {
    paddingVertical: 4,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: theme.typography.captionMedium.fontWeight,
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.textInverted,
  },
  categoryRowContainer: {
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.secondaryLight,
    borderColor: theme.colors.secondaryBorder,
  },
  categoryEmoji: {
    fontSize: theme.typography.caption.fontSize,
  },
  categoryText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  categoryTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 4,
    gap: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  thumbnail: {
    marginEnd: 10,
  },
  foodInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  foodTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  foodName: {
    flex: 1,
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: theme.typography.bodyMedium.fontWeight,
    color: theme.colors.textPrimary,
    marginEnd: 8,
  },
  foodCalories: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  foodMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodServing: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    maxWidth: 90,
  },
  macroDots: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  macroPreview: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  smallBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.colors.secondaryLight,
  },
  smallBadgeText: {
    fontSize: theme.typography.micro.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  favButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 4,
  },
  sessionTray: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    height: 58,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.floating,
  },
  sessionTrayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCountText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sessionTrayTitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primaryBorder,
  },
  sessionTrayKcal: {
    fontSize: theme.typography.callout.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  sessionTrayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionUndoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
  },
  sessionUndoText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sessionDoneButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  sessionDoneText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  portionDrawer: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadow.floating,
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  portionTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.textPrimary,
  },
  portionSubtitle: {
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  portionCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantContainer: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: theme.typography.captionMedium.fontWeight,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  variantScroll: {
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  variantChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  variantChipText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  variantChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  stepperContainer: {
    marginBottom: theme.spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: 56,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
    fontSize: theme.typography.title3.fontSize,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetBtnText: {
    fontSize: theme.typography.captionMedium.fontSize,
    color: theme.colors.textSecondary,
  },
  presetBtnTextActive: {
    color: theme.colors.textInverted,
    fontWeight: '700',
  },
  nutritionPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  nutritionTotalCal: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 4,
  },
  portionTotalCalNum: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.statHero.fontSize,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  portionTotalCalLabel: {
    fontSize: theme.typography.captionMedium.fontSize,
    color: theme.colors.textMuted,
  },
  nutritionPillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  portionMacroItem: {
    alignItems: 'center',
  },
  portionMacroLabel: {
    fontSize: theme.typography.micro.fontSize,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  portionMacroVal: {
    fontSize: theme.typography.callout.fontSize,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  primaryAddBtn: {
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.subtle,
  },
  primaryAddBtnText: {
    fontSize: theme.typography.title3.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  emptyActionButtonText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  moreActionsSheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  moreActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  moreActionsTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.textPrimary,
  },
  moreActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  moreActionIconBg: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionRowTitle: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: theme.typography.bodyMedium.fontWeight,
    color: theme.colors.textPrimary,
  },
  moreActionRowSub: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  cameraFullContainer: {
    flex: 1,
    backgroundColor: theme.colors.textPrimary,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCloseBtn: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraReticle: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.textInverted,
    borderRadius: theme.radius.lg,
  },
  cameraReticleText: {
    marginTop: 16,
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.textInverted,
    fontWeight: '600',
  },
  aiModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  aiModalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.textPrimary,
  },
  aiModalContent: {
    padding: theme.spacing.md,
  },
  aiPhotoCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiCardDesc: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  aiButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  aiPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiPrimaryBtnText: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  aiSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSecondaryBtnText: {
    fontSize: theme.typography.bodyMedium.fontSize,
    color: theme.colors.textPrimary,
  },
  aiLoadingBox: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  aiLoadingText: {
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.textMuted,
  },
  aiErrorText: {
    marginTop: 12,
    fontSize: theme.typography.callout.fontSize,
    color: theme.colors.danger,
    textAlign: 'center',
  },
  describeInput: {
    minHeight: 100,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlignVertical: 'top',
  },
  manualInput: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    fontSize: theme.typography.title3.fontSize,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.typography.captionMedium.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  formInput: {
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  errorText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.danger,
    marginBottom: 8,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  templateName: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  templateSub: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textMuted,
  },
  templateAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
  },
  templateAddBtnText: {
    fontSize: theme.typography.captionMedium.fontSize,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
});
