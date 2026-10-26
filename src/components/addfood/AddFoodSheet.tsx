import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSpringConfig } from '../../utils/reanimatedMotion';
import { isReducedMotion } from '../../utils/motion';
import { AppText as Text } from '../AppText';
import {
  X,
  Search,
  Barcode as BarcodeIcon,
  Camera as CameraIcon,
  Sparkles,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  Star,
  Copy,
  Utensils,
  Trash2,
  Bookmark,
  Info,
  Globe,
  Zap,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LoggedMeal, MealType, FoodItem, MealTemplate } from '../../types';
import { VERIFIED_FOOD_DATABASE, REGIONAL_FOODS } from '../../data/foodDatabase';
import { lookupBarcodeWithFallbacks } from '../../services/barcodeService';
import { searchOnlineFoodDatabase } from '../../services/onlineFoodSearchService';
import {
  analyzeMealImage,
  estimateMealFromText,
  getStoredGeminiApiKey,
  PlateAnalysisResult,
} from '../../services/plateAnalysisService';
import { GeminiKeyManager } from '../GeminiKeyManager';
import { AiReview } from './AiReview';
import { shouldResetFoodSelection, resolveSelectedVariantId } from './addFoodSelectionGuard';
import { SaveSuccessOverlay } from '../SaveSuccessOverlay';
import { FoodThumbnail } from '../FoodThumbnail';
import { RequestFoodModal } from '../RequestFoodModal';
import { useLanguage } from '../../i18n/I18nContext';
import { translate } from '../../i18n/strings';
import { normalizeSearch } from '../../utils/localeUtils';
import { formatDisplayDate, getTodayDateString } from '../../utils/dateUtils';
import { formatKcal } from '../../utils/formatKcal';
import { getPreviousDayString } from '../../utils/streak';
import {
  loadRecentFoods,
  addRecentFood,
  loadFavoriteFoods,
  toggleFavoriteFood,
  loadCustomFoods,
  addCustomFood,
  loadBarcodeCache,
  upsertBarcodeCacheItem,
  copyYesterdayMeals,
  copyYesterdayMealType,
  getYesterdayMealsPreview,
  YesterdayMealsPreview,
  loadDailyLog,
  loadFrequentFoods,
  loadMealTemplates,
  saveMealTemplate,
  deleteMealTemplate,
  createTemplateFromMeals,
} from '../../storage/storage';
import { FoodSourceBadge } from '../FoodSourceBadge';
import { getLocalizedFoodName } from '../../utils/foodLocalization';
import { createUniqueId } from '../../utils/idUtils';
import { theme } from '../../theme';
import * as Haptics from 'expo-haptics';

export interface AddFoodSheetProps {
  visible: boolean;
  onClose: () => void;
  mealType?: MealType;
  date: string;
  initialTab?: TabMode;
  initialScanBarcode?: boolean;
  onAddMeal: (meal: LoggedMeal, targetDate: string) => void;
  onCopyYesterdayMeals?: (targetDate: string) => Promise<void>;
}

type TabMode = 'search' | 'photo' | 'describe';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function getDefaultMealType(): MealType {
  const currentHour = new Date().getHours();
  if (currentHour < 11) return 'breakfast';
  if (currentHour < 15) return 'lunch';
  if (currentHour < 18) return 'snack';
  return 'dinner';
}

export const AddFoodSheet: React.FC<AddFoodSheetProps> = ({
  visible,
  onClose,
  mealType,
  date,
  initialTab,
  initialScanBarcode,
  onAddMeal,
  onCopyYesterdayMeals,
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = useCallback((str: string) => translate(language, str), [language]);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (!visible) {
      translateY.value = SCREEN_HEIGHT;
      return;
    }

    if (isReducedMotion()) {
      translateY.value = 0;
      return;
    }

    translateY.value = SCREEN_HEIGHT;
    translateY.value = withSpring(0, getSpringConfig('sheet'));
  }, [visible, translateY]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const [activeTab, setActiveTab] = useState<TabMode>('search');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealType || getDefaultMealType());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingsCount, setServingsCount] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [prevFoodId, setPrevFoodId] = useState<string | null>(null);

  const currentFoodId = selectedFood?.id ?? null;
  if (shouldResetFoodSelection(prevFoodId, selectedFood)) {
    setPrevFoodId(currentFoodId);
    setSelectedVariantId(resolveSelectedVariantId(selectedFood));
    setShowIngredients(false);
  }

  const activeVariant = useMemo(() => {
    if (!selectedFood?.variants || selectedFood.variants.length === 0) return null;
    return selectedFood.variants.find((v) => v.id === selectedVariantId) ?? selectedFood.variants[0];
  }, [selectedFood, selectedVariantId]);

  // Filter & Collections state
  type FoodFilter = 'all' | 'recent' | 'frequent' | 'favorites' | 'templates' | 'regional' | 'custom' | 'scanned';
  const [foodFilter, setFoodFilter] = useState<FoodFilter>('all');
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [currentDayMeals, setCurrentDayMeals] = useState<LoggedMeal[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [barcodeCache, setBarcodeCache] = useState<FoodItem[]>([]);

  // Modals state
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestModalInitialName, setRequestModalInitialName] = useState('');
  const [requestModalInitialBarcode, setRequestModalInitialBarcode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServingGrams, setCustomServingGrams] = useState<number>(100);
  const [customError, setCustomError] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMealTypeLoading, setCopyMealTypeLoading] = useState(false);
  const [yesterdayMealTypePreview, setYesterdayMealTypePreview] = useState<YesterdayMealsPreview>({ count: 0, calories: 0 });
  const [yesterdayAllPreview, setYesterdayAllPreview] = useState<YesterdayMealsPreview>({ count: 0, calories: 0 });

  // Online Food Search state
  const [onlineFoods, setOnlineFoods] = useState<FoodItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);

  // Quick Add state
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddCalories, setQuickAddCalories] = useState('');
  const [quickAddProtein, setQuickAddProtein] = useState('');
  const [quickAddCarbs, setQuickAddCarbs] = useState('');
  const [quickAddFat, setQuickAddFat] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // Barcode state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // AI Photo state
  const [hasApiKey, setHasApiKey] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PlateAnalysisResult | null>(null);

  // AI Describe state
  const [describeText, setDescribeText] = useState('');
  const [describeLoading, setDescribeLoading] = useState(false);
  const [describeError, setDescribeError] = useState<string | null>(null);
  const [describeResult, setDescribeResult] = useState<PlateAnalysisResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isToday = date === getTodayDateString();
  const isFuture = date > getTodayDateString();

  const currentMealType = mealType ?? null;
  const currentVisible = Boolean(visible);
  const [prevMealType, setPrevMealType] = useState<MealType | null>(currentMealType);
  const [prevVisible, setPrevVisible] = useState(currentVisible);
  if (currentVisible !== prevVisible || currentMealType !== prevMealType) {
    setPrevVisible(currentVisible);
    setPrevMealType(currentMealType);
    if (currentVisible) {
      setSelectedMeal(mealType || getDefaultMealType());
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (initialScanBarcode) {
        setIsScanningBarcode(true);
      }
    }
  }

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
      getYesterdayMealsPreview(date, selectedMeal),
      getYesterdayMealsPreview(date),
    ]).then(([recent, favs, custom, cachedBarcodes, frequent, templates, daily, mealTypePrev, allPrev]) => {
      if (!isMounted) return;
      setRecentFoods(recent);
      setFavoriteFoods(favs);
      setCustomFoods(custom);
      setBarcodeCache(cachedBarcodes);
      setFrequentFoods(frequent);
      setMealTemplates(templates);
      if (daily?.meals) {
        setCurrentDayMeals(daily.meals);
      }
      setYesterdayMealTypePreview(mealTypePrev);
      setYesterdayAllPreview(allPrev);
    }).catch((err) => {
      console.error('Error loading collections:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [date, selectedMeal]);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    getYesterdayMealsPreview(date, selectedMeal)
      .then((prev) => {
        if (isMounted) setYesterdayMealTypePreview(prev);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [visible, date, selectedMeal]);

  const checkApiKey = useCallback(() => {
    let isMounted = true;
    getStoredGeminiApiKey().then((k) => {
      if (isMounted) {
        setHasApiKey(Boolean(k));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cleanApiKey = checkApiKey();
    const cleanCollections = loadCollections();
    return () => {
      cleanApiKey();
      cleanCollections();
    };
  }, [visible, checkApiKey, loadCollections]);

  const handleClose = () => {
    setIsScanningBarcode(false);
    setPhotoResult(null);
    setDescribeResult(null);
    setSelectedFood(null);
    setSearchQuery('');
    setPhotoUri(null);
    setBarcodeError(null);
    setPhotoError(null);
    setDescribeError(null);
    setCustomModalVisible(false);
    setTemplateModalVisible(false);
    setQuickAddModalVisible(false);
    setCustomError(null);
    setTemplateError(null);
    setQuickAddError(null);
    setOnlineFoods([]);
    setHasSearchedOnline(false);
    onClose();
  };

  // --- SEARCH & BARCODE HANDLERS ---
  const handlePerformBarcodeLookup = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBarcodeLoading(true);
    setBarcodeError(null);

    try {
      const food = await lookupBarcodeWithFallbacks(clean);
      setSelectedFood(food);
      setServingsCount(1);
      setIsScanningBarcode(false);
      loadCollections();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setBarcodeError(err?.message || t('Could not find food for this barcode.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleSearchOnline = async () => {
    const clean = searchQuery.trim();
    if (!clean || clean.length < 2 || isSearchingOnline) return;
    setIsSearchingOnline(true);
    setHasSearchedOnline(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const results = await searchOnlineFoodDatabase(clean);
      setOnlineFoods(results);
      if (results.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      setOnlineFoods([]);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleQuickAddSave = () => {
    if (isFuture) return;
    const cal = parseInt(quickAddCalories, 10);
    if (isNaN(cal) || cal <= 0) {
      setQuickAddError(t('Please enter valid numbers for calories and macros.'));
      return;
    }

    const p = parseFloat(quickAddProtein) || 0;
    const c = parseFloat(quickAddCarbs) || 0;
    const f = parseFloat(quickAddFat) || 0;
    const mealName =
      quickAddName.trim() ||
      `${t('Quick Add')} (${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))})`;

    const meal: LoggedMeal = {
      id: createUniqueId('meal'),
      foodId: `quick_add_${Date.now()}`,
      name: mealName,
      mealType: selectedMeal,
      servings: 1,
      servingSize: '1 serving',
      servingGrams: 100,
      calories: cal,
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      source: 'custom',
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal, date);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setQuickAddModalVisible(false);
    setQuickAddName('');
    setQuickAddCalories('');
    setQuickAddProtein('');
    setQuickAddCarbs('');
    setQuickAddFat('');
    setQuickAddError(null);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      handleClose();
    }, 950);
  };

  const handleStartLiveBarcodeScan = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          t('Camera Permission Required'),
          t('Live barcode scanning requires camera permission. You can still look up any barcode manually.'),
          [{ text: t('OK') }]
        );
        return;
      }
    }
    setIsScanningBarcode(true);
    setBarcodeError(null);
  };

  const handleSaveSelectedFood = () => {
    if (!selectedFood || isFuture) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const activeCalories = activeVariant ? activeVariant.calories : selectedFood.calories;
    const activeProtein = activeVariant ? activeVariant.protein : selectedFood.protein;
    const activeCarbs = activeVariant ? activeVariant.carbs : selectedFood.carbs;
    const activeFat = activeVariant ? activeVariant.fat : selectedFood.fat;
    const effectiveGramsPerUnit = activeVariant?.servingGrams ?? (selectedFood.gramsPerUnit ?? selectedFood.servingGrams);
    const totalGrams = Math.round(effectiveGramsPerUnit * servingsCount);
    const baseServingGrams = activeVariant?.servingGrams ?? (selectedFood.servingGrams > 0 ? selectedFood.servingGrams : 100);
    const scaleRatio = totalGrams / baseServingGrams;

    const meal: LoggedMeal = {
      id: createUniqueId('meal'),
      foodId: selectedFood.id,
      name: selectedFood.name,
      brand: selectedFood.brand,
      category: selectedFood.category,
      mealType: selectedMeal,
      servings: servingsCount,
      servingSize: activeVariant?.servingSize ?? selectedFood.servingSize,
      servingGrams: totalGrams,
      calories: Math.round(activeCalories * scaleRatio),
      protein: Math.round(activeProtein * scaleRatio * 10) / 10,
      carbs: Math.round(activeCarbs * scaleRatio * 10) / 10,
      fat: Math.round(activeFat * scaleRatio * 10) / 10,
      fiber: selectedFood.fiber !== undefined ? Math.round(selectedFood.fiber * scaleRatio * 10) / 10 : undefined,
      sugar: selectedFood.sugar !== undefined ? Math.round(selectedFood.sugar * scaleRatio * 10) / 10 : undefined,
      sodium: selectedFood.sodium !== undefined ? Math.round(selectedFood.sodium * scaleRatio) : undefined,
      potassium: selectedFood.potassium !== undefined ? Math.round(selectedFood.potassium * scaleRatio) : undefined,
      calcium: selectedFood.calcium !== undefined ? Math.round(selectedFood.calcium * scaleRatio) : undefined,
      iron: selectedFood.iron !== undefined ? Math.round(selectedFood.iron * scaleRatio * 10) / 10 : undefined,
      vitaminC: selectedFood.vitaminC !== undefined ? Math.round(selectedFood.vitaminC * scaleRatio * 10) / 10 : undefined,
      vitaminA: selectedFood.vitaminA !== undefined ? Math.round(selectedFood.vitaminA * scaleRatio) : undefined,
      vitaminD: selectedFood.vitaminD !== undefined ? Math.round(selectedFood.vitaminD * scaleRatio * 10) / 10 : undefined,
      vitaminB12: selectedFood.vitaminB12 !== undefined ? Math.round(selectedFood.vitaminB12 * scaleRatio * 10) / 10 : undefined,
      magnesium: selectedFood.magnesium !== undefined ? Math.round(selectedFood.magnesium * scaleRatio) : undefined,
      zinc: selectedFood.zinc !== undefined ? Math.round(selectedFood.zinc * scaleRatio * 10) / 10 : undefined,
      barcode: selectedFood.barcode,
      source: selectedFood.source ?? (selectedFood.barcode ? 'open_food_facts' : undefined),
      isEstimate: selectedFood.isEstimate,
      portionUnit: selectedFood.portionUnit,
      gramsPerUnit: selectedFood.gramsPerUnit,
      ingredients: selectedFood.ingredients,
      variants: selectedFood.variants,
      selectedVariantId: activeVariant?.id,
      variantName: activeVariant?.name,
      recipeEstimate: selectedFood.recipeEstimate,
      imageUrl: selectedFood.imageUrl,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal, date);
    addRecentFood(selectedFood)
      .then((updated) => setRecentFoods(updated))
      .catch((err) => console.error('Failed to save recent food:', err));
    if (selectedFood.source === 'open_food_facts' || selectedFood.barcode) {
      upsertBarcodeCacheItem(selectedFood).catch(() => {});
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      handleClose();
    }, 950);
  };

  const handleCustomizeSelectedFood = () => {
    if (!selectedFood) return;
    const activeCalories = activeVariant ? activeVariant.calories : selectedFood.calories;
    const activeProtein = activeVariant ? activeVariant.protein : selectedFood.protein;
    const activeCarbs = activeVariant ? activeVariant.carbs : selectedFood.carbs;
    const activeFat = activeVariant ? activeVariant.fat : selectedFood.fat;
    const variantSuffix = activeVariant ? ` (${activeVariant.name})` : '';

    const rawServing = activeVariant?.servingSize ?? selectedFood.servingSize ?? '';
    const gramMatch = rawServing.match(/(\d+(?:\.\d+)?)\s*g/i);
    const parsedGrams = gramMatch ? parseFloat(gramMatch[1]) : 100;
    const initialServingGrams = activeVariant?.servingGrams ?? selectedFood.servingGrams ?? (Number.isFinite(parsedGrams) ? parsedGrams : 100);

    setCustomName(`${selectedFood.name}${variantSuffix}`);
    setCustomServing(rawServing || '1 serving');
    setCustomServingGrams(initialServingGrams);
    setCustomCalories(String(activeCalories));
    setCustomProtein(String(activeProtein));
    setCustomCarbs(String(activeCarbs));
    setCustomFat(String(activeFat));
    setCustomError(null);
    setSelectedFood(null);
    setCustomModalVisible(true);
  };

  const handleToggleFavorite = async (item: FoodItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const { favorites } = await toggleFavoriteFood(item);
      setFavoriteFoods(favorites);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleSaveCustomFood = async () => {
    const trimmedName = customName.trim();
    if (!trimmedName) {
      setCustomError(t('Please enter a valid food name.'));
      return;
    }
    const kcal = parseFloat(customCalories);
    const p = parseFloat(customProtein || '0');
    const c = parseFloat(customCarbs || '0');
    const f = parseFloat(customFat || '0');

    if (isNaN(kcal) || kcal < 0 || isNaN(p) || p < 0 || isNaN(c) || c < 0 || isNaN(f) || f < 0) {
      setCustomError(t('Please enter valid numbers for calories and macros.'));
      return;
    }

    const userGramMatch = customServing.match(/(\d+(?:\.\d+)?)\s*g/i);
    const resolvedServingGrams = userGramMatch
      ? parseFloat(userGramMatch[1])
      : (customServingGrams > 0 ? customServingGrams : 100);

    const newFood: FoodItem = {
      id: createUniqueId('food_custom'),
      name: trimmedName,
      servingSize: customServing.trim() || '1 serving',
      servingGrams: Math.round(resolvedServingGrams),
      calories: Math.round(kcal),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      source: 'custom',
    };

    try {
      const updated = await addCustomFood(newFood);
      setCustomFoods(updated);
      setSelectedFood(newFood);
      setServingsCount(1);
      setCustomModalVisible(false);
      setCustomName('');
      setCustomServing('');
      setCustomCalories('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setCustomError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setCustomError(t('Failed to save meal.'));
    }
  };

  const handleCopyYesterday = async () => {
    if (isFuture || copyLoading) return;
    setCopyLoading(true);
    try {
      const yesterday = getPreviousDayString(date);
      const yesterdayLog = await loadDailyLog(yesterday);
      if (!yesterdayLog.meals || yesterdayLog.meals.length === 0) {
        Alert.alert(t("Copy yesterday's meals"), t('No meals were logged yesterday.'));
        return;
      }
      const res = await copyYesterdayMeals(date);
      if (onCopyYesterdayMeals) {
        await onCopyYesterdayMeals(date);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (res.addedCount > 0) {
        Alert.alert(
          t("Copy yesterday's meals"),
          `${t('Added')} ${res.addedCount} ${res.addedCount === 1 ? t('meal added') : t('meals added')}.`
        );
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          handleClose();
        }, 950);
      } else {
        Alert.alert(
          t("Copy yesterday's meals"),
          t('Nothing new to copy.')
        );
      }
    } catch (err) {
      console.error('Failed to copy yesterday meals:', err);
      Alert.alert(t('Error'), t('Failed to save meal.'));
    } finally {
      setCopyLoading(false);
    }
  };

  const getCopyMealTypeLabel = (meal: MealType) => {
    switch (meal) {
      case 'breakfast':
        return t("Copy yesterday's breakfast");
      case 'lunch':
        return t("Copy yesterday's lunch");
      case 'dinner':
        return t("Copy yesterday's dinner");
      case 'snack':
      default:
        return t("Copy yesterday's snacks");
    }
  };

  const handleCopyYesterdayMealType = async () => {
    if (isFuture || copyMealTypeLoading) return;
    setCopyMealTypeLoading(true);
    try {
      const yesterday = getPreviousDayString(date);
      const yesterdayLog = await loadDailyLog(yesterday);
      const matchingMeals = (yesterdayLog.meals || []).filter((m) => m.mealType === selectedMeal);
      if (matchingMeals.length === 0) {
        Alert.alert(
          getCopyMealTypeLabel(selectedMeal),
          t('No meals were logged yesterday for this meal.')
        );
        return;
      }
      const res = await copyYesterdayMealType(date, selectedMeal);
      if (onCopyYesterdayMeals) {
        await onCopyYesterdayMeals(date);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (res.addedCount > 0) {
        Alert.alert(
          getCopyMealTypeLabel(selectedMeal),
          `${t('Added')} ${res.addedCount} ${res.addedCount === 1 ? t('meal added') : t('meals added')}.`
        );
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          handleClose();
        }, 950);
      } else {
        Alert.alert(
          getCopyMealTypeLabel(selectedMeal),
          t('Nothing new to copy.')
        );
      }
    } catch (err) {
      console.error('Failed to copy yesterday meal type:', err);
      Alert.alert(t('Error'), t('Failed to save meal.'));
    } finally {
      setCopyMealTypeLoading(false);
    }
  };

  const handleLogTemplate = (template: MealTemplate) => {
    if (isFuture) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    template.items.forEach((item) => {
      const meal: LoggedMeal = {
        id: createUniqueId('meal'),
        foodId: createUniqueId('food_tmpl'),
        name: item.name,
        mealType: selectedMeal,
        servings: item.servings,
        servingSize: item.servingSize,
        servingGrams: item.servingGrams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        sugar: item.sugar,
        portionUnit: item.portionUnit,
        gramsPerUnit: item.gramsPerUnit,
        isEstimate: item.isEstimate,
        source: item.source ?? 'custom',
        timestamp: new Date().toISOString(),
      };
      onAddMeal(meal, date);
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      handleClose();
    }, 950);
  };

  const handleDeleteTemplate = (template: MealTemplate) => {
    Alert.alert(
      t('Delete template'),
      t('Are you sure you want to delete this template?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteMealTemplate(template.id);
            setMealTemplates(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          },
        },
      ]
    );
  };

  const handleCreateTemplateFromCurrentMeals = async () => {
    const trimmed = templateName.trim();
    if (!trimmed) {
      setTemplateError(t('Please enter a valid food name.'));
      return;
    }
    const currentMeals = currentDayMeals.filter((m) => m.mealType === selectedMeal);
    if (currentMeals.length === 0) {
      setTemplateError(t('No meals were logged yesterday for this meal.'));
      return;
    }
    setTemplateSaving(true);
    try {
      const newTemplate = createTemplateFromMeals(trimmed, selectedMeal, currentMeals);
      const updated = await saveMealTemplate(newTemplate);
      setMealTemplates(updated);
      setTemplateModalVisible(false);
      setTemplateName('');
      setTemplateError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setTemplateError(t('Failed to save meal.'));
    } finally {
      setTemplateSaving(false);
    }
  };

  // --- AI PHOTO HANDLERS ---
  const handlePickPhoto = async (fromCamera: boolean) => {
    setPhotoError(null);
    setPhotoResult(null);

    let res: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert(t('Camera Access'), t('Camera permission is required to photograph your meal.'));
        return;
      }
      res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
    } else {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libPerm.granted) {
        Alert.alert(t('Photo Access'), t('Gallery access is required to choose a meal photo.'));
        return;
      }
      res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
    }

    if (res.canceled || !res.assets || !res.assets.length) return;
    const asset = res.assets[0];
    setPhotoUri(asset.uri);

    if (!asset.base64) {
      setPhotoError(t('Could not process photo data. Please try again.'));
      return;
    }

    setPhotoLoading(true);
    try {
      const analysis = await analyzeMealImage(asset.base64);
      setPhotoResult(analysis);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setPhotoError(err?.message || t('Failed to analyze meal photo.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setPhotoLoading(false);
    }
  };

  // --- AI DESCRIBE HANDLERS ---
  const handleEstimateDescribe = async () => {
    const text = describeText.trim();
    if (!text || describeLoading) return;

    setDescribeLoading(true);
    setDescribeError(null);
    setDescribeResult(null);

    const langName = language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';
    try {
      const result = await estimateMealFromText(text, langName);
      setDescribeResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setDescribeError(err?.message || t('Could not estimate meal nutrition.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setDescribeLoading(false);
    }
  };

  // --- AI LOG CALLBACKS ---
  const handleLogAiItem = (meal: LoggedMeal) => {
    onAddMeal(meal, date);
  };

  const handleLogAllAiItems = (meals: LoggedMeal[]) => {
    meals.forEach((m) => onAddMeal(m, date));
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      handleClose();
    }, 950);
  };

  // Filtered Food Search with Arabic/Sorani variant normalization (memoized)
  const filteredFoods = useMemo(() => {
    let sourceList: FoodItem[] = [];
    if (foodFilter === 'recent') {
      sourceList = recentFoods;
    } else if (foodFilter === 'frequent') {
      sourceList = frequentFoods;
    } else if (foodFilter === 'favorites') {
      sourceList = favoriteFoods;
    } else if (foodFilter === 'custom') {
      sourceList = customFoods;
    } else if (foodFilter === 'regional') {
      sourceList = REGIONAL_FOODS;
    } else if (foodFilter === 'scanned') {
      sourceList = barcodeCache;
    } else {
      sourceList = [...customFoods, ...barcodeCache, ...VERIFIED_FOOD_DATABASE];
    }

    const normalizedQuery = normalizeSearch(searchQuery);
    if (!normalizedQuery) return sourceList;

    return sourceList.filter((f) => {
      const normName = normalizeSearch(f.name);
      const normNameAr = f.nameAr ? normalizeSearch(f.nameAr) : '';
      const normNameCkb = f.nameCkb ? normalizeSearch(f.nameCkb) : '';
      const normCategory = f.category ? normalizeSearch(f.category) : '';
      const normBrand = f.brand ? normalizeSearch(f.brand) : '';
      const normBarcode = f.barcode ? normalizeSearch(f.barcode) : '';
      const localizedName = normalizeSearch(t(f.name));
      return (
        normName.includes(normalizedQuery) ||
        normNameAr.includes(normalizedQuery) ||
        normNameCkb.includes(normalizedQuery) ||
        normCategory.includes(normalizedQuery) ||
        normBrand.includes(normalizedQuery) ||
        normBarcode.includes(normalizedQuery) ||
        localizedName.includes(normalizedQuery)
      );
    });
  }, [foodFilter, recentFoods, frequentFoods, favoriteFoods, customFoods, barcodeCache, searchQuery, t]);

  const mealCategories: { key: MealType; label: string }[] = useMemo(
    () => [
      { key: 'breakfast', label: t('Breakfast') },
      { key: 'lunch', label: t('Lunch') },
      { key: 'dinner', label: t('Dinner') },
      { key: 'snack', label: t('Snacks') },
    ],
    [t]
  );

  const headerTitle = isToday
    ? `${t('Add food')} · ${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`
    : `${formatDisplayDate(date, language)} · ${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`;

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={[styles.backdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityLabel={t('Close')}
            accessibilityRole="button"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', height: '92%', justifyContent: 'flex-end' }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.sheetContainer,
                animatedSheetStyle,
                { height: '100%', paddingBottom: Math.max(theme.spacing.md, insets.bottom + 12) },
              ]}
            >
              <SaveSuccessOverlay visible={showSuccess} message={t('Food Logged')} />
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerContext}>
                {isToday ? t('Today') : formatDisplayDate(date, language)}
              </Text>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityLabel={t('Close')}
              accessibilityRole="button"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Meal Slot Selector */}
          <View style={styles.mealSlotRow}>
            {mealCategories.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.mealSlotChip, selectedMeal === m.key && styles.mealSlotChipActive]}
                onPress={() => setSelectedMeal(m.key)}
                accessibilityRole="button"
                accessibilityLabel={m.label}
              >
                <Text
                  style={[
                    styles.mealSlotText,
                    selectedMeal === m.key && styles.mealSlotTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'search' && styles.segmentBtnActive]}
              onPress={() => {
                setActiveTab('search');
                setIsScanningBarcode(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Search')}
            >
              <Search
                size={14}
                color={activeTab === 'search' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'search' && styles.segmentTextActive,
                ]}
                numberOfLines={2}
              >
                {t('Search')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'photo' && styles.segmentBtnActive]}
              onPress={() => {
                setActiveTab('photo');
                setIsScanningBarcode(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Analyze meal photo')}
            >
              <Sparkles
                size={14}
                color={activeTab === 'photo' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'photo' && styles.segmentTextActive,
                ]}
                numberOfLines={2}
              >
                {t('Analyze meal photo')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'describe' && styles.segmentBtnActive]}
              onPress={() => {
                setActiveTab('describe');
                setIsScanningBarcode(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Describe with AI')}
            >
              <Sparkles
                size={14}
                color={activeTab === 'describe' ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeTab === 'describe' && styles.segmentTextActive,
                ]}
                numberOfLines={2}
              >
                {t('Describe with AI')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: SEARCH & BARCODE */}
          {activeTab === 'search' && (
            <View style={{ flex: 1 }}>
              {isScanningBarcode ? (
                <View style={styles.cameraFrame}>
                  {Platform.OS === 'web' ? (
                    <View style={styles.cameraWebFallback}>
                      <AlertTriangle size={28} color={theme.colors.accent} />
                      <Text style={styles.fallbackTitle}>{t('Web Browser Camera')}</Text>
                      <Text style={styles.fallbackDesc}>
                        {t('Live video barcode scanning requires native mobile camera hardware. Use manual barcode entry below to look up any product immediately.')}
                      </Text>
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => setIsScanningBarcode(false)}
                        accessibilityRole="button"
                        accessibilityLabel={t('Enter digits')}
                      >
                        <Text style={styles.actionBtnPrimaryText}>{t('Enter digits')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      barcodeScannerSettings={{
                        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                      }}
                      onBarcodeScanned={({ data }) => {
                        handlePerformBarcodeLookup(data);
                      }}
                    >
                      <View style={styles.reticleOverlay}>
                        <View style={styles.reticle} />
                        <Text style={styles.reticleText}>{t('Scan barcode')}</Text>
                        <TouchableOpacity
                          style={styles.cancelScanBtn}
                          onPress={() => setIsScanningBarcode(false)}
                          accessibilityRole="button"
                          accessibilityLabel={t('Close')}
                        >
                          <Text style={styles.cancelScanText}>{t('Close')}</Text>
                        </TouchableOpacity>
                      </View>
                    </CameraView>
                  )}
                </View>
              ) : (
                <>
                  {/* Search Bar + Barcode Scanner Trigger */}
                  <View style={styles.searchBarRow}>
                    <View style={styles.searchBar}>
                      <Search size={16} color={theme.colors.textMuted} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder={t('Search foods...')}
                        placeholderTextColor={theme.colors.textMuted}
                        value={searchQuery}
                        onChangeText={(txt) => {
                          setSearchQuery(txt);
                          setOnlineFoods([]);
                          setHasSearchedOnline(false);
                        }}
                        autoFocus={!selectedFood}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setSearchQuery('');
                            setOnlineFoods([]);
                            setHasSearchedOnline(false);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t('Clear search')}
                        >
                          <X size={15} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.barcodeIconBtn}
                      onPress={handleStartLiveBarcodeScan}
                      accessibilityLabel={t('Scan barcode')}
                      accessibilityRole="button"
                    >
                      <BarcodeIcon size={19} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Manual Barcode Input Fallback Drawer */}
                  <View style={styles.manualBarcodeRow}>
                    <TextInput
                      style={styles.manualBarcodeInput}
                      placeholder={t('Enter Barcode (UPC / EAN)')}
                      placeholderTextColor={theme.colors.textMuted}
                      value={manualBarcode}
                      onChangeText={setManualBarcode}
                      keyboardType="numeric"
                      onSubmitEditing={() => handlePerformBarcodeLookup(manualBarcode)}
                    />
                    <TouchableOpacity
                      style={styles.manualBarcodeSubmitBtn}
                      onPress={() => handlePerformBarcodeLookup(manualBarcode)}
                      disabled={barcodeLoading || !manualBarcode.trim()}
                      accessibilityRole="button"
                      accessibilityLabel={t('Search')}
                    >
                      {barcodeLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.textInverted} />
                      ) : (
                        <Text style={styles.manualBarcodeSubmitText}>{t('Search')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {barcodeError && (
                    <View style={styles.errorNotice}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <AlertTriangle size={15} color={theme.colors.danger} />
                        <Text style={styles.errorNoticeText}>{barcodeError}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.requestBarcodeBtn}
                        onPress={() => {
                          setRequestModalInitialName('');
                          setRequestModalInitialBarcode(manualBarcode.trim());
                          setRequestModalVisible(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('Request a Food')}
                      >
                        <Text style={styles.requestBarcodeBtnText}>{t('Request a Food')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Selected Food Confirmation Box */}
                  {selectedFood && (() => {
                    const activeCalories = activeVariant ? activeVariant.calories : selectedFood.calories;
                    const activeProtein = activeVariant ? activeVariant.protein : selectedFood.protein;
                    const activeCarbs = activeVariant ? activeVariant.carbs : selectedFood.carbs;
                    const activeFat = activeVariant ? activeVariant.fat : selectedFood.fat;
                    const effectiveGramsPerUnit = activeVariant?.servingGrams ?? (selectedFood.gramsPerUnit ?? selectedFood.servingGrams);
                    const totalGrams = Math.round(effectiveGramsPerUnit * servingsCount);
                    const baseServingGrams = activeVariant?.servingGrams ?? (selectedFood.servingGrams > 0 ? selectedFood.servingGrams : 100);
                    const scaleRatio = totalGrams / baseServingGrams;

                    return (
                      <View style={styles.selectedFoodCard}>
                        <View style={styles.selectedHeaderRow}>
                          <View style={styles.selectedBadgesRow}>
                            {selectedFood.source ? (
                              <FoodSourceBadge source={selectedFood.source} size="small" />
                            ) : null}
                            {selectedFood.recipeEstimate ? (
                              <View style={styles.recipeEstimateBadge}>
                                <Sparkles size={11} color="#C2410C" />
                                <Text style={styles.recipeEstimateBadgeText}>{t('Recipe estimate')}</Text>
                              </View>
                            ) : selectedFood.isEstimate ? (
                              <View style={styles.estimateBadge}>
                                <Info size={11} color="#92400E" />
                                <Text style={styles.estimateBadgeText}>{t('Culinary Estimate')}</Text>
                              </View>
                            ) : null}
                            {selectedFood.barcode ? (
                              <View style={styles.barcodeBadge}>
                                <BarcodeIcon size={11} color={theme.colors.textMuted} />
                                <Text style={styles.barcodeBadgeText}>{selectedFood.barcode}</Text>
                              </View>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => setSelectedFood(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={t('Cancel')}
                            accessibilityRole="button"
                          >
                            <X size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.selectedTop}>
                          <FoodThumbnail
                            name={selectedFood.name}
                            category={selectedFood.category}
                            imageUrl={selectedFood.imageUrl}
                            size="medium"
                            style={{ marginEnd: 12 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.selectedName}>{getLocalizedFoodName(selectedFood, language)}</Text>
                            {selectedFood.brand ? (
                              <Text style={styles.selectedBrand}>{selectedFood.brand}</Text>
                            ) : null}
                            <Text style={styles.selectedPortion}>
                              {selectedFood.portionUnit
                                ? `${servingsCount} ${t(selectedFood.portionUnit)} (${totalGrams}g)`
                                : `${activeVariant?.servingSize ?? selectedFood.servingSize} (${totalGrams}g)`}
                            </Text>
                            <Text style={styles.selectedMacrosPreview}>
                              {`P: ${(activeProtein * scaleRatio).toFixed(1)}g • C: ${(activeCarbs * scaleRatio).toFixed(1)}g • F: ${(activeFat * scaleRatio).toFixed(1)}g`}
                            </Text>
                          </View>
                          <Text style={styles.selectedKcal}>
                            {formatKcal(activeCalories * scaleRatio, t)}
                          </Text>
                        </View>

                        {/* Variants Selector */}
                        {selectedFood.variants && selectedFood.variants.length > 0 ? (
                          <View style={styles.variantSection}>
                            <Text style={styles.variantSectionTitle}>{t('Preparation / Variant:')}</Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.variantChipsRow}
                            >
                              {selectedFood.variants.map((v) => {
                                const isSelected = activeVariant?.id === v.id;
                                return (
                                  <TouchableOpacity
                                    key={v.id}
                                    style={[styles.variantChip, isSelected && styles.variantChipActive]}
                                    onPress={() => setSelectedVariantId(v.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={v.name}
                                  >
                                    <Text style={[styles.variantChipText, isSelected && styles.variantChipTextActive]}>
                                      {v.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        ) : null}

                        {/* Recipe Ingredients Breakdown */}
                        {selectedFood.ingredients && selectedFood.ingredients.length > 0 ? (
                          <View style={styles.ingredientsSection}>
                            <TouchableOpacity
                              style={styles.ingredientsToggleBtn}
                              onPress={() => setShowIngredients((prev) => !prev)}
                              accessibilityRole="button"
                              accessibilityLabel={t('Recipe ingredients & USDA sources')}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Utensils size={14} color={theme.colors.primary} />
                                <Text style={styles.ingredientsToggleText}>
                                  {t('Recipe ingredients & USDA sources')} ({selectedFood.ingredients.length})
                                </Text>
                              </View>
                              <Text style={styles.ingredientsToggleAction}>
                                {showIngredients ? t('Hide ingredients') : t('Show ingredients')}
                              </Text>
                            </TouchableOpacity>

                            {showIngredients ? (
                              <View style={styles.ingredientsListCard}>
                                {selectedFood.ingredients.map((ing, idx) => (
                                  <View key={idx} style={styles.ingredientRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.ingredientName}>{ing.name}</Text>
                                      <Text style={styles.ingredientSource}>{t('Source:')} {ing.source}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', marginStart: 8 }}>
                                      <Text style={styles.ingredientGrams}>{ing.grams}g</Text>
                                      {ing.calories !== undefined ? (
                                        <Text style={styles.ingredientKcal}>{formatKcal(ing.calories, t)}</Text>
                                      ) : null}
                                    </View>
                                  </View>
                                ))}
                                <TouchableOpacity
                                  style={styles.customizeRecipeBtn}
                                  onPress={handleCustomizeSelectedFood}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('Customize recipe')}
                                >
                                  <Text style={styles.customizeRecipeBtnText}>{t('Customize recipe')}</Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                          </View>
                        ) : null}

                        <View style={styles.stepperRow}>
                          <Text style={styles.stepperLabel}>
                            {selectedFood.portionUnit ? `${t('Portions')} (${t(selectedFood.portionUnit)}):` : t('Servings:')}
                          </Text>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => setServingsCount((c) => Math.max(0.5, c - 0.5))}
                              accessibilityRole="button"
                              accessibilityLabel={t('Decrease')}
                            >
                              <Minus size={13} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.stepVal}>{servingsCount}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={() => setServingsCount((c) => c + 0.5)}
                              accessibilityRole="button"
                              accessibilityLabel={t('Increase')}
                            >
                              <Plus size={13} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.selectedActionButtonsRow}>
                          <TouchableOpacity
                            style={styles.cancelSelectedBtn}
                            onPress={() => setSelectedFood(null)}
                            accessibilityRole="button"
                            accessibilityLabel={t('Cancel')}
                          >
                            <Text style={styles.cancelSelectedBtnText}>{t('Cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.confirmAddBtn, { flex: 1, marginTop: 0 }]}
                            onPress={handleSaveSelectedFood}
                            accessibilityRole="button"
                            accessibilityLabel={t('Log to Diary')}
                          >
                            <Check size={16} color={theme.colors.textInverted} />
                            <Text style={styles.confirmAddBtnText}>{t('Log to Diary')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Filter Chips & Quick Actions Row */}
                  <View style={styles.filterActionsContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filterChipsRow}
                    >
                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'all' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('all')}
                        accessibilityRole="button"
                        accessibilityLabel={t('All')}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'all' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('All')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'recent' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('recent')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Recent')} ${recentFoods.length > 0 ? `(${recentFoods.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'recent' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Recent')} {recentFoods.length > 0 ? `(${recentFoods.length})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'frequent' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('frequent')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Frequent')} ${frequentFoods.length > 0 ? `(${frequentFoods.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'frequent' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Frequent')} {frequentFoods.length > 0 ? `(${frequentFoods.length})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'favorites' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('favorites')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Favorites')} ${favoriteFoods.length > 0 ? `(${favoriteFoods.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'favorites' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Favorites')} {favoriteFoods.length > 0 ? `(${favoriteFoods.length})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'templates' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('templates')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Templates')} ${mealTemplates.length > 0 ? `(${mealTemplates.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'templates' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Templates')} {mealTemplates.length > 0 ? `(${mealTemplates.length})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'regional' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('regional')}
                        accessibilityRole="button"
                        accessibilityLabel={t('Iraqi & Kurdish')}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'regional' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Iraqi & Kurdish')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'custom' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('custom')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Custom')} ${customFoods.length > 0 ? `(${customFoods.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'custom' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Custom')} {customFoods.length > 0 ? `(${customFoods.length})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.filterChip, foodFilter === 'scanned' && styles.filterChipActive]}
                        onPress={() => setFoodFilter('scanned')}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Scanned')} ${barcodeCache.length > 0 ? `(${barcodeCache.length})` : ''}`.trim()}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            foodFilter === 'scanned' && styles.filterChipTextActive,
                          ]}
                        >
                          {t('Scanned')} {barcodeCache.length > 0 ? `(${barcodeCache.length})` : ''}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quickActionsRow}
                    >
                      <TouchableOpacity
                        style={[styles.quickActionBtn, styles.quickAddActionBtn]}
                        onPress={() => {
                          setQuickAddName('');
                          setQuickAddCalories('');
                          setQuickAddProtein('');
                          setQuickAddCarbs('');
                          setQuickAddFat('');
                          setQuickAddError(null);
                          setQuickAddModalVisible(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('Quick Add Calories')}
                      >
                        <Zap size={13} color={theme.colors.primary} />
                        <Text style={[styles.quickActionBtnText, { fontWeight: '700' }]} numberOfLines={1}>
                          {t('Quick Add')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={handleCopyYesterdayMealType}
                        disabled={copyMealTypeLoading || isFuture}
                        accessibilityRole="button"
                        accessibilityLabel={getCopyMealTypeLabel(selectedMeal)}
                      >
                        {copyMealTypeLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Utensils size={13} color={theme.colors.primary} />
                        )}
                        <Text style={styles.quickActionBtnText} numberOfLines={1}>
                          {getCopyMealTypeLabel(selectedMeal)}
                          {yesterdayMealTypePreview.count > 0 ? ` (${yesterdayMealTypePreview.count} • ${formatKcal(yesterdayMealTypePreview.calories, t)})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={handleCopyYesterday}
                        disabled={copyLoading || isFuture}
                        accessibilityRole="button"
                        accessibilityLabel={t("Copy yesterday's meals")}
                      >
                        {copyLoading ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Copy size={13} color={theme.colors.primary} />
                        )}
                        <Text style={styles.quickActionBtnText} numberOfLines={1}>
                          {t("Copy yesterday's meals")}
                          {yesterdayAllPreview.count > 0 ? ` (${yesterdayAllPreview.count} • ${formatKcal(yesterdayAllPreview.calories, t)})` : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => {
                          setTemplateError(null);
                          setTemplateModalVisible(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('Save as template')}
                      >
                        <Bookmark size={13} color={theme.colors.primary} />
                        <Text style={styles.quickActionBtnText} numberOfLines={1}>
                          {t('Save as template')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => {
                          setCustomError(null);
                          setCustomServingGrams(100);
                          setCustomModalVisible(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('Create custom food')}
                      >
                        <Plus size={13} color={theme.colors.primary} />
                        <Text style={styles.quickActionBtnText} numberOfLines={1}>
                          {t('Create custom food')}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  {/* Foods List / Meal Templates List */}
                  <ScrollView
                    contentContainerStyle={[
                      styles.foodListScroll,
                      { paddingBottom: Math.max(48, insets.bottom + 36) },
                    ]}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.listHeaderRow}>
                      <Text style={styles.listHeaderTitle}>
                        {searchQuery.trim().length > 0
                          ? `${filteredFoods.length} ${t('results')}`
                          : foodFilter === 'recent'
                          ? t('Recent foods')
                          : foodFilter === 'frequent'
                          ? t('Frequent foods')
                          : foodFilter === 'favorites'
                          ? t('Favorites')
                          : foodFilter === 'templates'
                          ? t('Meal templates')
                          : foodFilter === 'regional'
                          ? t('Iraqi & Kurdish')
                          : foodFilter === 'custom'
                          ? t('Custom foods')
                          : foodFilter === 'scanned'
                          ? t('Scanned')
                          : t('Common & Frequent Foods')}
                      </Text>
                    </View>

                    {foodFilter === 'templates' ? (
                      mealTemplates.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <Bookmark size={28} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
                          <Text style={styles.emptyStateText}>{t('No meal templates saved yet.')}</Text>
                          <Text style={[styles.emptyStateText, { fontSize: 11, marginTop: 4, color: theme.colors.textMuted }]}>
                            {t('Log your favorite dishes once, then tap "Save as template" to log them in 1 tap anytime.')}
                          </Text>
                        </View>
                      ) : (
                        mealTemplates.map((template) => (
                          <View key={template.id} style={styles.templateCard}>
                            <View style={styles.templateHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Bookmark size={14} color={theme.colors.primary} />
                                  <Text style={styles.templateName}>{template.name}</Text>
                                </View>
                                <Text style={styles.templateMealType}>
                                  {template.mealType ? t(template.mealType.charAt(0).toUpperCase() + template.mealType.slice(1)) : t('Meal')} · {template.items.length} {template.items.length === 1 ? t('item') : t('items')}
                                </Text>
                              </View>
                              <Text style={styles.templateKcal}>{formatKcal(template.totalCalories, t)}</Text>
                            </View>

                            <View style={styles.templateItemsList}>
                              {template.items.map((it, idx) => (
                                <Text key={idx} style={styles.templateItemText} numberOfLines={1}>
                                  • {it.name} ({it.portionUnit ? `${it.servings} ${t(it.portionUnit)}` : it.servingSize})
                                </Text>
                              ))}
                            </View>

                            <View style={styles.templateMacros}>
                              <Text style={styles.templateMacrosText}>
                                P: {Math.round(template.totalProtein)}g • C: {Math.round(template.totalCarbs)}g • F: {Math.round(template.totalFat)}g
                              </Text>
                            </View>

                            <View style={styles.templateActionsRow}>
                              <TouchableOpacity
                                style={styles.templateDeleteBtn}
                                onPress={() => handleDeleteTemplate(template)}
                                accessibilityRole="button"
                                accessibilityLabel={t('Delete template')}
                              >
                                <Trash2 size={14} color={theme.colors.danger} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.templateLogBtn}
                                onPress={() => handleLogTemplate(template)}
                                accessibilityRole="button"
                                accessibilityLabel={`${t('Log to ')}${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`}
                              >
                                <Check size={14} color={theme.colors.textInverted} />
                                <Text style={styles.templateLogBtnText}>
                                  {`${t('Log to ')}${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )
                    ) : filteredFoods.length === 0 ? (
                      <View style={styles.emptyStateBox}>
                        <Text style={styles.emptyStateText}>
                          {foodFilter === 'recent'
                            ? t('No recent foods yet.')
                            : foodFilter === 'frequent'
                            ? t('No frequent foods logged yet.')
                            : foodFilter === 'favorites'
                            ? t('No favorite foods yet.')
                            : foodFilter === 'regional'
                            ? t('No regional foods found.')
                            : foodFilter === 'custom'
                            ? t('No custom foods yet.')
                            : foodFilter === 'scanned'
                            ? t('No scanned foods in cache yet.')
                            : `${t('No foods found matching')} "${searchQuery}"`}
                        </Text>

                        {searchQuery.trim().length >= 2 && !isSearchingOnline && !hasSearchedOnline && (
                          <TouchableOpacity
                            style={styles.globalSearchPromptBtn}
                            onPress={handleSearchOnline}
                            accessibilityRole="button"
                            accessibilityLabel={t('Search Global Database')}
                          >
                            <Globe size={15} color={theme.colors.primary} />
                            <Text style={styles.globalSearchPromptBtnText}>
                              {`${t('Search Global Database')} ("${searchQuery.trim()}")`}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isSearchingOnline && (
                          <View style={styles.globalSearchLoadingBox}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.globalSearchLoadingText}>{t('Searching global database...')}</Text>
                          </View>
                        )}

                        {hasSearchedOnline && onlineFoods.length > 0 && (
                          <View style={{ width: '100%', marginTop: 8 }}>
                            <View style={styles.onlineSectionHeader}>
                              <Globe size={14} color={theme.colors.secondary} />
                              <Text style={styles.onlineSectionTitle}>
                                {t('Global Database Results')} ({onlineFoods.length})
                              </Text>
                            </View>
                            {onlineFoods.map((item) => (
                              <TouchableOpacity
                                key={item.id}
                                style={[
                                  styles.foodListItem,
                                  selectedFood?.id === item.id && styles.foodListItemActive,
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                  setSelectedFood(item);
                                }}
                                activeOpacity={0.7}
                              >
                                <FoodThumbnail
                                  name={item.name}
                                  category={item.category}
                                  imageUrl={item.imageUrl}
                                  size="small"
                                  style={{ marginEnd: 12 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                    <Text style={styles.itemTitle}>{getLocalizedFoodName(item, language)}</Text>
                                    {item.source && <FoodSourceBadge source={item.source} size="small" />}
                                  </View>
                                  <Text style={styles.itemSub}>
                                    {item.brand ? `${item.brand} • ` : ''}
                                    {item.servingSize} • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
                                  </Text>
                                </View>
                                <View style={styles.itemRightCol}>
                                  <Text style={styles.itemKcal}>{formatKcal(item.calories, t)}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {hasSearchedOnline && onlineFoods.length === 0 && (
                          <View style={styles.onlineNoResultsBox}>
                            <Text style={styles.onlineNoResultsText}>{t('No online foods found.')}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.requestFoodPromptBtn}
                          onPress={() => {
                            setRequestModalInitialName(searchQuery.trim());
                            setRequestModalInitialBarcode(manualBarcode.trim());
                            setRequestModalVisible(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t('Request a Food')}
                        >
                          <Plus size={14} color={theme.colors.primary} />
                          <Text style={styles.requestFoodPromptBtnText}>
                            {t('Request a Food')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {filteredFoods.map((item) => {
                          const isFav = favoriteFoods.some(
                            (f) => f.id === item.id || f.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                          );
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.foodListItem,
                                selectedFood?.id === item.id && styles.foodListItemActive,
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                setSelectedFood(item);
                              }}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={item.name}
                            >
                              <FoodThumbnail
                                name={item.name}
                                category={item.category}
                                imageUrl={item.imageUrl}
                                size="small"
                                style={{ marginEnd: 12 }}
                              />
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={styles.itemTitle}>{item.name}</Text>
                                  {item.recipeEstimate ? (
                                    <View style={styles.recipeEstimateBadgeSmall}>
                                      <Text style={styles.recipeEstimateBadgeSmallText}>{t('Recipe estimate')}</Text>
                                    </View>
                                  ) : item.isEstimate ? (
                                    <View style={styles.estimateBadgeSmall}>
                                      <Text style={styles.estimateBadgeSmallText}>{t('Estimate')}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={styles.itemSub}>
                                  {item.portionUnit
                                    ? `1 ${t(item.portionUnit)} (${item.gramsPerUnit ?? item.servingGrams}g) • P: ${item.protein}g C: ${item.carbs}g F: ${item.fat}g`
                                    : `${item.servingSize} • P: ${item.protein}g C: ${item.carbs}g F: ${item.fat}g`}
                                </Text>
                              </View>
                              <View style={styles.itemRightCol}>
                                <Text style={styles.itemKcal}>{formatKcal(item.calories, t)}</Text>
                                <TouchableOpacity
                                  style={styles.favStarBtn}
                                  onPress={() => handleToggleFavorite(item)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityRole="button"
                                  accessibilityLabel={isFav ? t('Remove from favorites') : t('Add to favorites')}
                                >
                                  <Star
                                    size={16}
                                    color={isFav ? '#D97706' : theme.colors.textMuted}
                                    fill={isFav ? '#D97706' : 'none'}
                                  />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        {searchQuery.trim().length >= 2 && !isSearchingOnline && !hasSearchedOnline && (
                          <TouchableOpacity
                            style={styles.globalSearchPromptBtn}
                            onPress={handleSearchOnline}
                            accessibilityRole="button"
                            accessibilityLabel={t('Search Global Database')}
                          >
                            <Globe size={15} color={theme.colors.primary} />
                            <Text style={styles.globalSearchPromptBtnText}>
                              {`${t('Search Global Database')} ("${searchQuery.trim()}")`}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isSearchingOnline && (
                          <View style={styles.globalSearchLoadingBox}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.globalSearchLoadingText}>{t('Searching global database...')}</Text>
                          </View>
                        )}

                        {hasSearchedOnline && onlineFoods.length > 0 && (
                          <View style={{ width: '100%', marginTop: 8 }}>
                            <View style={styles.onlineSectionHeader}>
                              <Globe size={14} color={theme.colors.secondary} />
                              <Text style={styles.onlineSectionTitle}>
                                {t('Global Database Results')} ({onlineFoods.length})
                              </Text>
                            </View>
                            {onlineFoods.map((item) => (
                              <TouchableOpacity
                                key={item.id}
                                style={[
                                  styles.foodListItem,
                                  selectedFood?.id === item.id && styles.foodListItemActive,
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                  setSelectedFood(item);
                                }}
                                activeOpacity={0.7}
                              >
                                <FoodThumbnail
                                  name={item.name}
                                  category={item.category}
                                  imageUrl={item.imageUrl}
                                  size="small"
                                  style={{ marginEnd: 12 }}
                                />
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                    <Text style={styles.itemTitle}>{getLocalizedFoodName(item, language)}</Text>
                                    {item.source && <FoodSourceBadge source={item.source} size="small" />}
                                  </View>
                                  <Text style={styles.itemSub}>
                                    {item.brand ? `${item.brand} • ` : ''}
                                    {item.servingSize} • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
                                  </Text>
                                </View>
                                <View style={styles.itemRightCol}>
                                  <Text style={styles.itemKcal}>{formatKcal(item.calories, t)}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {searchQuery.trim().length > 0 && (
                          <TouchableOpacity
                            style={styles.searchFooterRequestBtn}
                            onPress={() => {
                              setRequestModalInitialName(searchQuery.trim());
                              setRequestModalInitialBarcode('');
                              setRequestModalVisible(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('Request a food')}
                          >
                            <Text style={styles.searchFooterRequestText}>
                              {t("Can't find what you are looking for?")}{' '}
                              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                                {t('Request a food')}
                              </Text>
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {/* TAB 2: AI MEAL PHOTO */}
          {activeTab === 'photo' && (
            <ScrollView
              contentContainerStyle={[
                styles.tabContentScroll,
                { paddingBottom: Math.max(48, insets.bottom + 36) },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {!hasApiKey && (
                <GeminiKeyManager onKeyChanged={checkApiKey} />
              )}

              <View style={styles.photoActionsCard}>
                <Text style={styles.photoCardTitle}>{t('Analyze meal photo')}</Text>
                <Text style={styles.photoCardSub}>
                  {t('Estimate nutrition from a photo of home-cooked plates or restaurant dishes.')}
                </Text>

                <View style={styles.photoBtnRow}>
                  <TouchableOpacity
                    style={styles.photoPickBtn}
                    onPress={() => handlePickPhoto(true)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('Take plate photo')}
                  >
                    <CameraIcon size={16} color={theme.colors.textInverted} />
                    <Text style={styles.photoPickBtnText}>{t('Take plate photo')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoPickBtnSecondary}
                    onPress={() => handlePickPhoto(false)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('From gallery')}
                  >
                    <ImageIcon size={16} color={theme.colors.textPrimary} />
                    <Text style={styles.photoPickBtnSecondaryText}>{t('From gallery')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {photoUri && (
                <Image source={{ uri: photoUri }} style={styles.platePreviewImage} />
              )}

              {photoLoading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>
                    {t('Analyzing meal components and portions...')}
                  </Text>
                </View>
              )}

              {photoError && (
                <View style={styles.errorNotice}>
                  <AlertTriangle size={16} color={theme.colors.danger} />
                  <Text style={styles.errorNoticeText}>{photoError}</Text>
                </View>
              )}

              {photoResult && (
                <AiReview
                  key={`photo_${photoResult.mealName}_${photoResult.totalCalories}_${photoResult.items.length}`}
                  result={photoResult}
                  mealType={selectedMeal}
                  targetDate={date}
                  onLogItem={handleLogAiItem}
                  onLogAll={handleLogAllAiItems}
                />
              )}
            </ScrollView>
          )}

          {/* TAB 3: AI DESCRIBE */}
          {activeTab === 'describe' && (
            <ScrollView
              contentContainerStyle={[
                styles.tabContentScroll,
                { paddingBottom: Math.max(48, insets.bottom + 36) },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {!hasApiKey && (
                <GeminiKeyManager onKeyChanged={checkApiKey} />
              )}

              <View style={styles.describeCard}>
                <View style={styles.describeHeaderRow}>
                  <Sparkles size={16} color={theme.colors.accent} />
                  <Text style={styles.describeTitle}>{t('Describe what you ate')}</Text>
                </View>

                <Text style={styles.describeSub}>
                  {t('Get an estimate, review portions, then log')}
                </Text>

                <TextInput
                  style={styles.describeInput}
                  value={describeText}
                  onChangeText={setDescribeText}
                  placeholder={t('Describe what you ate')}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!describeLoading}
                />

                <TouchableOpacity
                  style={[
                    styles.actionBtnPrimary,
                    (!describeText.trim() || describeLoading) && styles.actionBtnDisabled,
                  ]}
                  onPress={handleEstimateDescribe}
                  disabled={!describeText.trim() || describeLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('Estimate nutrition')}
                >
                  {describeLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverted} />
                  ) : (
                    <>
                      <Sparkles size={15} color={theme.colors.textInverted} />
                      <Text style={styles.actionBtnPrimaryText}>{t('Estimate nutrition')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {describeError && (
                <View style={styles.errorNotice}>
                  <AlertTriangle size={16} color={theme.colors.danger} />
                  <Text style={styles.errorNoticeText}>{describeError}</Text>
                </View>
              )}

              {describeResult && (
                <AiReview
                  key={`describe_${describeResult.mealName}_${describeResult.totalCalories}_${describeResult.items.length}`}
                  result={describeResult}
                  mealType={selectedMeal}
                  targetDate={date}
                  onLogItem={handleLogAiItem}
                  onLogAll={handleLogAllAiItems}
                />
              )}
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  </Modal>

    {/* Custom Food Creation Modal */}
    <Modal
      visible={customModalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setCustomModalVisible(false)}
    >
      <View style={[styles.customModalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <Text style={styles.customModalTitle}>{t('Create custom food')}</Text>
              <TouchableOpacity
                onPress={() => setCustomModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {customError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{customError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Food name')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={t('Food name')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Serving description (e.g. 1 bowl, 100g)')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={t('Serving description (e.g. 1 bowl, 100g)')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customServing}
                  onChangeText={setCustomServing}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Calories (kcal)')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder="250"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.macrosRowInputs}>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Protein (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Carbs (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Fat (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customFat}
                    onChangeText={setCustomFat}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={handleSaveCustomFood}
              accessibilityRole="button"
              accessibilityLabel={t('Save custom food')}
            >
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.saveCustomBtnText}>{t('Save custom food')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Quick Add Calories Modal */}
    <Modal
      visible={quickAddModalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setQuickAddModalVisible(false)}
    >
      <View style={[styles.customModalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Zap size={18} color={theme.colors.primary} />
                <Text style={styles.customModalTitle}>{t('Quick Add Calories')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setQuickAddModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {quickAddError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{quickAddError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Food name')} ({t('Optional')})</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={`${t('Quick Add')} (${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))})`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={quickAddName}
                  onChangeText={setQuickAddName}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Calories')} *</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder="e.g. 450"
                  placeholderTextColor={theme.colors.textMuted}
                  value={quickAddCalories}
                  onChangeText={setQuickAddCalories}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <View style={styles.macrosRowInputs}>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Protein')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddProtein}
                    onChangeText={setQuickAddProtein}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Carbs')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddCarbs}
                    onChangeText={setQuickAddCarbs}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Fat')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddFat}
                    onChangeText={setQuickAddFat}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={handleQuickAddSave}
              accessibilityRole="button"
              accessibilityLabel={t('Log Calories')}
            >
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.saveCustomBtnText}>{t('Log Calories')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Meal Template Creation Modal */}
    <Modal
      visible={templateModalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setTemplateModalVisible(false)}
    >
      <View style={[styles.customModalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Bookmark size={17} color={theme.colors.primary} />
                <Text style={styles.customModalTitle}>{t('Save as template')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setTemplateModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {templateError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{templateError}</Text>
              </View>
            )}

            <Text style={styles.templateModalDescription}>
              {`${t('Save current')} ${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))} (${currentDayMeals.filter((m) => m.mealType === selectedMeal).length} ${t('items')}) ${t('as a reusable template to log again in one tap.')}`}
            </Text>

            <View style={styles.customInputGroup}>
              <Text style={styles.customInputLabel}>{t('Template name')}</Text>
              <TextInput
                style={styles.customTextInput}
                placeholder={t('e.g. My Usual Breakfast, Friday BBQ')}
                placeholderTextColor={theme.colors.textMuted}
                value={templateName}
                onChangeText={setTemplateName}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={handleCreateTemplateFromCurrentMeals}
              disabled={templateSaving}
              accessibilityRole="button"
              accessibilityLabel={t('Save template')}
            >
              {templateSaving ? (
                <ActivityIndicator size="small" color={theme.colors.textInverted} />
              ) : (
                <>
                  <Check size={16} color={theme.colors.textInverted} />
                  <Text style={styles.saveCustomBtnText}>{t('Save template')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Request a Food Community Modal */}
    <RequestFoodModal
      visible={requestModalVisible}
      onClose={() => setRequestModalVisible(false)}
      initialFoodName={requestModalInitialName}
      initialBarcode={requestModalInitialBarcode}
    />
  </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    height: '92%',
    padding: theme.spacing.md,
    gap: 12,
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerContext: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  mealSlotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealSlotChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  mealSlotChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  mealSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  mealSlotTextActive: {
    color: theme.colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 90,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.subtle,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
    flexShrink: 1,
  },
  segmentTextActive: {
    color: theme.colors.primary,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  barcodeIconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBarcodeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  manualBarcodeInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  manualBarcodeSubmitBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
  },
  manualBarcodeSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  cameraFrame: {
    flex: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginTop: 8,
  },
  cameraWebFallback: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  fallbackDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  reticleOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  reticle: {
    width: 240,
    height: 140,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  reticleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelScanBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  cancelScanText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    padding: 10,
    borderRadius: theme.radius.md,
    marginTop: 6,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.danger,
    lineHeight: 16,
  },
  selectedFoodCard: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  selectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedBrand: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  selectedPortion: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedMacrosPreview: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 4,
  },
  selectedKcal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  confirmAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
  confirmAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2,
  },
  selectedBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  barcodeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  selectedActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cancelSelectedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSelectedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  listHeaderRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  listHeaderTitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  foodListScroll: {
    paddingTop: 4,
    paddingBottom: 20,
    gap: 6,
  },
  foodListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  foodListItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemKcal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tabContentScroll: {
    paddingBottom: 24,
    gap: 12,
  },
  photoActionsCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  photoCardTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  photoCardSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  photoPickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  photoPickBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  photoPickBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  platePreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  describeCard: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  describeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  describeTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  describeSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  describeInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  filterActionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textInverted,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  itemRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  favStarBtn: {
    padding: 2,
  },
  emptyStateBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  customModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  customModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  customModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customModalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  customInputGroup: {
    marginBottom: 8,
  },
  customInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  customTextInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  macrosRowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  saveCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
  saveCustomBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  estimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  estimateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  estimateBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.full,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  estimateBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  recipeEstimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  recipeEstimateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  recipeEstimateBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radius.full,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  recipeEstimateBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C2410C',
  },
  variantSection: {
    marginTop: 10,
    gap: 6,
  },
  variantSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  variantChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  variantChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  variantChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  variantChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  variantChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  ingredientsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  ingredientsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ingredientsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  ingredientsToggleAction: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  ingredientsListCard: {
    marginTop: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 8,
    gap: 6,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 4,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ingredientSource: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  ingredientGrams: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ingredientKcal: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  customizeRecipeBtn: {
    marginTop: 4,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
  },
  customizeRecipeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  templateCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  templateMealType: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  templateKcal: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  templateItemsList: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: 8,
    gap: 3,
  },
  templateItemText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  templateMacros: {
    paddingVertical: 2,
  },
  templateMacrosText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  templateActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  templateDeleteBtn: {
    padding: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateLogBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  templateLogBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  templateModalDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  requestBarcodeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    marginStart: 8,
  },
  requestBarcodeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  requestFoodPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  requestFoodPromptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  searchFooterRequestBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 8,
  },
  searchFooterRequestText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quickAddActionBtn: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  globalSearchPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 10,
    width: '100%',
  },
  globalSearchPromptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  globalSearchLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    width: '100%',
  },
  globalSearchLoadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  onlineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 10,
    marginBottom: 6,
  },
  onlineSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  onlineNoResultsBox: {
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  onlineNoResultsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
