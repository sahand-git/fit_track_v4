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
  Platform,
  Alert,
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
  Sparkles,
  Plus,
  Check,
  Star,
  Copy,
  Utensils,
  Trash2,
  Bookmark,
  Globe,
  Zap,
  WifiOff,
  Clock,
  Database,
} from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LoggedMeal, MealType, FoodItem, MealTemplate, AppLanguage } from '../../types';
import { lookupBarcodeWithFallbacks } from '../../services/barcodeService';
import { searchOnlineFoodDatabase } from '../../services/onlineFoodSearchService';
import {
  analyzeMealImage,
  estimateMealFromText,
  getStoredGeminiApiKey,
  PlateAnalysisResult,
} from '../../services/plateAnalysisService';
import { shouldResetFoodSelection, resolveSelectedVariantId } from './addFoodSelectionGuard';
import { SaveSuccessOverlay } from '../SaveSuccessOverlay';
import { FoodThumbnail } from '../FoodThumbnail';
import { RequestFoodModal } from '../RequestFoodModal';
import { useLanguage } from '../../i18n/I18nContext';
import { translate } from '../../i18n/strings';
import { formatDisplayDate, getTodayDateString } from '../../utils/dateUtils';
import { formatKcal } from '../../utils/formatKcal';
import { getPreviousDayString } from '../../utils/streak';
import { AddFoodPortionPicker } from './AddFoodPortionPicker';
import { AddFoodBarcodeScanner } from './AddFoodBarcodeScanner';
import { AddFoodAiPhotoSection } from './AddFoodAiPhotoSection';
import { AddFoodAiDescribeSection } from './AddFoodAiDescribeSection';
import { AddFoodCustomModal } from './AddFoodCustomModal';
import { AddFoodQuickAddModal } from './AddFoodQuickAddModal';
import { AddFoodTemplateModal } from './AddFoodTemplateModal';
import { useFoodSearch, FoodFilter } from './useFoodSearch';
import { CANONICAL_FOOD_CATEGORIES, CATEGORY_DEFAULT_EMOJI, CanonicalFoodCategory } from '../../utils/foodCategories';
import { REGIONAL_FOODS } from '../../data/foodDatabase';
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
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
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

interface FoodListItemRowProps {
  item: FoodItem;
  isSelected: boolean;
  isFavorite: boolean;
  language: AppLanguage;
  onSelect: (item: FoodItem) => void;
  onToggleFavorite?: (item: FoodItem) => void;
  t: (key: string) => string;
  theme: ThemeType;
  styles: ReturnType<typeof createStyles>;
  isOnlineItem?: boolean;
}

const FoodListItemRow = React.memo<FoodListItemRowProps>(
  ({
    item,
    isSelected,
    isFavorite,
    language,
    onSelect,
    onToggleFavorite,
    t,
    theme,
    styles,
    isOnlineItem = false,
  }) => {
    const displayName = getLocalizedFoodName(item, language);
    const servingStr = item.portionUnit
      ? `1 ${t(item.portionUnit)} (${item.gramsPerUnit ?? item.servingGrams}g)`
      : item.servingSize;
    const kcalStr = formatKcal(item.calories, t);
    const macrosStr = `${t('Protein')} ${item.protein}g, ${t('Carbs')} ${item.carbs}g, ${t('Fat')} ${item.fat}g`;
    const foodAccessibilityLabel = `${displayName}, ${item.brand ? `${item.brand}, ` : ''}${servingStr}, ${kcalStr}, ${macrosStr}`;

    return (
      <View
        style={[
          styles.foodListItem,
          isOnlineItem && styles.foodListItemSimple,
          isSelected && styles.foodListItemActive,
        ]}
      >
        <TouchableOpacity
          style={styles.foodListItemMain}
          onPress={() => onSelect(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={foodAccessibilityLabel}
        >
          <FoodThumbnail
            name={displayName}
            category={item.category}
            imageUrl={item.imageUrl}
            size="small"
            style={{ marginEnd: 12 }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.itemTitle}>{displayName}</Text>
              <FoodSourceBadge
                source={item.source || (item.recipeEstimate ? 'regional_culinary_estimate' : item.isEstimate ? 'generic_estimate' : undefined)}
                sourceRef={item.sourceRef}
                size="small"
              />
              {item.isIncomplete && (
                <View style={styles.incompleteItemBadge}>
                  <Text style={styles.incompleteItemBadgeText}>{t('Incomplete Data')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemSub}>
              {item.brand ? `${item.brand} • ` : ''}
              {servingStr} • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
            </Text>
          </View>
          <View style={styles.itemRightCol}>
            <Text style={styles.itemKcal}>{kcalStr}</Text>
          </View>
        </TouchableOpacity>
        {!isOnlineItem && onToggleFavorite && (
          <TouchableOpacity
            style={styles.favStarBtn}
            onPress={() => onToggleFavorite(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? `${t('Remove from favorites')}: ${displayName}` : `${t('Add to favorites')}: ${displayName}`}
          >
            <Star
              size={16}
              color={isFavorite ? theme.colors.amber : theme.colors.textMuted}
              fill={isFavorite ? theme.colors.amber : 'none'}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.isSelected === next.isSelected &&
    prev.isFavorite === next.isFavorite &&
    prev.theme === next.theme &&
    prev.language === next.language &&
    prev.item.calories === next.item.calories &&
    prev.item.protein === next.item.protein &&
    prev.item.carbs === next.item.carbs &&
    prev.item.fat === next.item.fat
);
FoodListItemRow.displayName = 'FoodListItemRow';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
  const [foodFilter, setFoodFilter] = useState<FoodFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
  const [isOnlineOffline, setIsOnlineOffline] = useState(false);
  const [isOnlineRateLimited, setIsOnlineRateLimited] = useState(false);
  const [isOnlineFromCache, setIsOnlineFromCache] = useState(false);

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

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        try {
          console.timeEnd('[PERF] Add Food Sheet -> Interactive');
        } catch {}
      });
    }
  }, [visible]);

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
    setIsOnlineOffline(false);
    setIsOnlineRateLimited(false);
    setIsOnlineFromCache(false);
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

  const handleSearchOnline = useCallback(async () => {
    const clean = searchQuery.trim();
    if (!clean || clean.length < 2 || isSearchingOnline) return;
    setIsSearchingOnline(true);
    setHasSearchedOnline(true);
    setIsOnlineOffline(false);
    setIsOnlineRateLimited(false);
    setIsOnlineFromCache(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await searchOnlineFoodDatabase(clean);
      setOnlineFoods(result.foods);
      setIsOnlineOffline(!!result.isOffline);
      setIsOnlineRateLimited(!!result.isRateLimited);
      setIsOnlineFromCache(!!result.fromCache);
      if (result.foods.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      setOnlineFoods([]);
      setIsOnlineOffline(true);
    } finally {
      setIsSearchingOnline(false);
    }
  }, [searchQuery, isSearchingOnline]);

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

  const doSaveMeal = () => {
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

  const handleSaveSelectedFood = () => {
    if (!selectedFood || isFuture) return;

    const isIncomplete = Boolean(
      selectedFood.isIncomplete ||
      (selectedFood.source === 'open_food_facts' && (selectedFood.calories === 0 || (selectedFood.protein === 0 && selectedFood.carbs === 0 && selectedFood.fat === 0)))
    );

    if (isIncomplete) {
      Alert.alert(
        t('Incomplete Nutrition Data'),
        t('This food is missing full nutrition information. Would you like to log it anyway or customize the values first?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Customize Values'),
            onPress: () => handleCustomizeSelectedFood(),
          },
          {
            text: t('Log Anyway'),
            style: 'destructive',
            onPress: () => doSaveMeal(),
          },
        ]
      );
      return;
    }

    doSaveMeal();
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

  const handleToggleFavorite = useCallback(async (item: FoodItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const { favorites } = await toggleFavoriteFood(item);
      setFavoriteFoods(favorites);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }, []);

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
  const filteredFoods = useFoodSearch({
    searchQuery,
    foodFilter,
    selectedCategory,
    recentFoods,
    frequentFoods,
    favoriteFoods,
    customFoods,
    barcodeCache,
    language,
    t,
  });

  const isDiscoveryMode =
    foodFilter === 'all' && searchQuery.trim() === '' && !selectedCategory;

  const listData = useMemo(() => {
    if (isDiscoveryMode) {
      return REGIONAL_FOODS;
    }
    return filteredFoods;
  }, [isDiscoveryMode, filteredFoods]);

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

  const handleSelectFood = useCallback((item: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedFood(item);
  }, []);

  const favoriteFoodIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of favoriteFoods) {
      set.add(f.id);
      set.add(f.name.trim().toLowerCase());
    }
    return set;
  }, [favoriteFoods]);

  const renderFoodItem = useCallback(
    ({ item }: { item: FoodItem }) => {
      const isFav =
        favoriteFoodIds.has(item.id) ||
        favoriteFoodIds.has(item.name.trim().toLowerCase());
      return (
        <FoodListItemRow
          item={item}
          isSelected={selectedFood?.id === item.id}
          isFavorite={isFav}
          language={language}
          onSelect={handleSelectFood}
          onToggleFavorite={handleToggleFavorite}
          t={t}
          theme={theme}
          styles={styles}
        />
      );
    },
    [favoriteFoodIds, selectedFood?.id, language, handleSelectFood, handleToggleFavorite, t, theme, styles]
  );

  const renderListHeader = useMemo(() => {
    if (isDiscoveryMode) {
      return (
        <View style={{ width: '100%', gap: 12, paddingBottom: 4 }}>
          {/* 1. Recents */}
          {recentFoods.length > 0 && (
            <View style={styles.discoverySection}>
              <View style={styles.discoverySectionHeader}>
                <Clock size={14} color={theme.colors.primary} />
                <Text style={styles.discoverySectionTitle}>
                  {t('Recent')} ({recentFoods.length})
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {recentFoods.slice(0, 5).map((item) => (
                  <FoodListItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedFood?.id === item.id}
                    isFavorite={
                      favoriteFoodIds.has(item.id) ||
                      favoriteFoodIds.has(item.name.trim().toLowerCase())
                    }
                    language={language}
                    onSelect={handleSelectFood}
                    onToggleFavorite={handleToggleFavorite}
                    t={t}
                    theme={theme}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          )}

          {/* 2. Frequent */}
          {frequentFoods.length > 0 && (
            <View style={styles.discoverySection}>
              <View style={styles.discoverySectionHeader}>
                <Zap size={14} color={theme.colors.orangeDeep} />
                <Text style={styles.discoverySectionTitle}>
                  {t('Frequent')} ({frequentFoods.length})
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {frequentFoods.slice(0, 5).map((item) => (
                  <FoodListItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedFood?.id === item.id}
                    isFavorite={
                      favoriteFoodIds.has(item.id) ||
                      favoriteFoodIds.has(item.name.trim().toLowerCase())
                    }
                    language={language}
                    onSelect={handleSelectFood}
                    onToggleFavorite={handleToggleFavorite}
                    t={t}
                    theme={theme}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          )}

          {/* 3. Favorites */}
          {favoriteFoods.length > 0 && (
            <View style={styles.discoverySection}>
              <View style={styles.discoverySectionHeader}>
                <Star size={14} color={theme.colors.secondary} />
                <Text style={styles.discoverySectionTitle}>
                  {t('Favorites')} ({favoriteFoods.length})
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {favoriteFoods.slice(0, 5).map((item) => (
                  <FoodListItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedFood?.id === item.id}
                    isFavorite={true}
                    language={language}
                    onSelect={handleSelectFood}
                    onToggleFavorite={handleToggleFavorite}
                    t={t}
                    theme={theme}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          )}

          {/* 4. Category Chips */}
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <Utensils size={14} color={theme.colors.primary} />
              <Text style={styles.discoverySectionTitle}>
                {t('Categories')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'all' && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory('all')}
                accessibilityRole="button"
                accessibilityLabel={t('All')}
              >
                <Text style={styles.categoryChipEmoji}>🍽️</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === 'all' && styles.categoryChipTextActive,
                  ]}
                >
                  {t('All')}
                </Text>
              </TouchableOpacity>
              {CANONICAL_FOOD_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={t(cat)}
                >
                  <Text style={styles.categoryChipEmoji}>{CATEGORY_DEFAULT_EMOJI[cat]}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {t(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 5. Regional Dishes Section Header */}
          <View style={[styles.discoverySectionHeader, { marginTop: 2 }]}>
            <Globe size={14} color={theme.colors.secondary} />
            <Text style={styles.discoverySectionTitle}>
              {t('Iraqi & Kurdish')} ({REGIONAL_FOODS.length})
            </Text>
          </View>
        </View>
      );
    }

    if (foodFilter === 'all' && selectedCategory) {
      return (
        <View style={{ width: '100%', gap: 8, paddingBottom: 6 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            <TouchableOpacity
              style={styles.categoryChip}
              onPress={() => setSelectedCategory(null)}
              accessibilityRole="button"
              accessibilityLabel={t('Clear')}
            >
              <X size={12} color={theme.colors.textMuted} />
              <Text style={styles.categoryChipText}>{t('Clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'all' && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory('all')}
              accessibilityRole="button"
              accessibilityLabel={t('All')}
            >
              <Text style={styles.categoryChipEmoji}>🍽️</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'all' && styles.categoryChipTextActive,
                ]}
              >
                {t('All')}
              </Text>
            </TouchableOpacity>
            {CANONICAL_FOOD_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                accessibilityRole="button"
                accessibilityLabel={t(cat)}
              >
                <Text style={styles.categoryChipEmoji}>{CATEGORY_DEFAULT_EMOJI[cat]}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {t(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              {selectedCategory === 'all'
                ? `${filteredFoods.length} ${t('results')}`
                : `${CATEGORY_DEFAULT_EMOJI[selectedCategory as CanonicalFoodCategory] || ''} ${t(selectedCategory)} (${filteredFoods.length})`}
            </Text>
          </View>
        </View>
      );
    }

    return (
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
    );
  }, [
    isDiscoveryMode,
    recentFoods,
    frequentFoods,
    favoriteFoods,
    selectedCategory,
    foodFilter,
    searchQuery,
    filteredFoods.length,
    selectedFood?.id,
    favoriteFoodIds,
    language,
    handleSelectFood,
    handleToggleFavorite,
    t,
    theme,
    styles,
  ]);

  const renderEmptyState = useMemo(() => {
    return (
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
      </View>
    );
  }, [foodFilter, searchQuery, t, styles]);

  const renderListFooter = useMemo(() => {
    return (
      <View style={{ width: '100%', gap: 6, paddingTop: 4 }}>
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

        {isOnlineRateLimited && (
          <View style={styles.onlineAlertBox}>
            <Clock size={16} color={theme.colors.orangeDeep} />
            <Text style={styles.onlineAlertText}>
              {t('Rate limit reached. Please wait a few seconds before searching again.')}
            </Text>
          </View>
        )}

        {isOnlineOffline && onlineFoods.length === 0 && (
          <View style={styles.onlineOfflineBox}>
            <WifiOff size={18} color={theme.colors.orangeDeep} />
            <Text style={styles.onlineOfflineText}>
              {t('You are currently offline. Check your internet connection or browse the offline catalog.')}
            </Text>
          </View>
        )}

        {hasSearchedOnline && onlineFoods.length > 0 && (
          <View style={{ width: '100%', marginTop: 8, gap: 6 }}>
            <View style={styles.onlineSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                <Globe size={14} color={theme.colors.secondary} />
                <Text style={styles.onlineSectionTitle}>
                  {t('Global Database Results')} ({onlineFoods.length})
                </Text>
                {isOnlineFromCache && (
                  <View style={styles.cachedBadge}>
                    <Database size={11} color={theme.colors.textMuted} />
                    <Text style={styles.cachedBadgeText}>{t('Showing cached results')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.openFoodFactsCreditText}>
                {t('Powered by Open Food Facts (ODbL)')}
              </Text>
            </View>
            {onlineFoods.map((item) => (
              <FoodListItemRow
                key={item.id}
                item={item}
                isSelected={selectedFood?.id === item.id}
                isFavorite={false}
                language={language}
                onSelect={handleSelectFood}
                t={t}
                theme={theme}
                styles={styles}
                isOnlineItem={true}
              />
            ))}
          </View>
        )}

        {hasSearchedOnline && !isOnlineOffline && !isOnlineRateLimited && onlineFoods.length === 0 && (
          <View style={styles.onlineNoResultsBox}>
            <Text style={styles.onlineNoResultsText}>{t('No online foods found.')}</Text>
          </View>
        )}

        {listData.length === 0 && (
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
      </View>
    );
  }, [
    searchQuery,
    isSearchingOnline,
    hasSearchedOnline,
    isOnlineRateLimited,
    isOnlineOffline,
    onlineFoods,
    isOnlineFromCache,
    listData.length,
    selectedFood?.id,
    language,
    handleSelectFood,
    manualBarcode,
    t,
    theme,
    styles,
    handleSearchOnline,
  ]);

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
            behavior="padding"
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
                <AddFoodBarcodeScanner
                  isScanningBarcode={true}
                  onBarcodeScanned={handlePerformBarcodeLookup}
                  onCloseScanner={() => setIsScanningBarcode(false)}
                  manualBarcode={manualBarcode}
                  onManualBarcodeChange={setManualBarcode}
                  onPerformBarcodeLookup={handlePerformBarcodeLookup}
                  barcodeLoading={barcodeLoading}
                  barcodeError={barcodeError}
                  t={t}
                />
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
                          console.time('[PERF] Search Keystroke -> Rendered');
                          setSearchQuery(txt);
                          setOnlineFoods([]);
                          setHasSearchedOnline(false);
                          setIsOnlineOffline(false);
                          setIsOnlineRateLimited(false);
                          setIsOnlineFromCache(false);
                          requestAnimationFrame(() => {
                            try {
                              console.timeEnd('[PERF] Search Keystroke -> Rendered');
                            } catch {}
                          });
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
                  <AddFoodBarcodeScanner
                    isScanningBarcode={false}
                    onBarcodeScanned={handlePerformBarcodeLookup}
                    onCloseScanner={() => setIsScanningBarcode(false)}
                    manualBarcode={manualBarcode}
                    onManualBarcodeChange={setManualBarcode}
                    onPerformBarcodeLookup={handlePerformBarcodeLookup}
                    barcodeLoading={barcodeLoading}
                    barcodeError={barcodeError}
                    onRequestFoodWithBarcode={() => {
                      setRequestModalInitialName('');
                      setRequestModalInitialBarcode(manualBarcode.trim());
                      setRequestModalVisible(true);
                    }}
                    t={t}
                  />

                  {/* Selected Food Confirmation Box */}
                  {selectedFood && (
                    <AddFoodPortionPicker
                      food={selectedFood}
                      servingsCount={servingsCount}
                      onServingsChange={setServingsCount}
                      activeVariant={activeVariant ?? undefined}
                      onSelectVariant={setSelectedVariantId}
                      showIngredients={showIngredients}
                      onToggleIngredients={() => setShowIngredients((prev) => !prev)}
                      onCustomizeRecipe={handleCustomizeSelectedFood}
                      onCancel={() => setSelectedFood(null)}
                      onConfirm={handleSaveSelectedFood}
                      language={language}
                      t={t}
                    />
                  )}

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
                  {foodFilter === 'templates' ? (
                    <ScrollView
                      contentContainerStyle={[
                        styles.foodListScroll,
                        { paddingBottom: Math.max(48, insets.bottom + 36) },
                      ]}
                      keyboardShouldPersistTaps="handled"
                    >
                      {renderListHeader}
                      {mealTemplates.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <Bookmark size={28} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
                          <Text style={styles.emptyStateText}>{t('No meal templates saved yet.')}</Text>
                          <Text style={[styles.emptyStateText, { fontSize: 12, marginTop: 4, color: theme.colors.textMuted }]}>
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
                      )}
                    </ScrollView>
                  ) : (
                    <FlatList
                      data={listData}
                      keyExtractor={(item) => item.id}
                      renderItem={renderFoodItem}
                      initialNumToRender={12}
                      maxToRenderPerBatch={10}
                      windowSize={5}
                      removeClippedSubviews={Platform.OS === 'android'}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={[
                        styles.foodListScroll,
                        { paddingBottom: Math.max(48, insets.bottom + 36) },
                      ]}
                      ListHeaderComponent={renderListHeader}
                      ListEmptyComponent={renderEmptyState}
                      ListFooterComponent={renderListFooter}
                    />
                  )}
                </>
              )}
            </View>
          )}

          {/* TAB 2: AI MEAL PHOTO */}
          {activeTab === 'photo' && (
            <AddFoodAiPhotoSection
              hasApiKey={hasApiKey}
              onKeyChanged={checkApiKey}
              onPickPhoto={handlePickPhoto}
              photoUri={photoUri}
              photoLoading={photoLoading}
              photoError={photoError}
              photoResult={photoResult}
              selectedMeal={selectedMeal}
              targetDate={date}
              onLogAiItem={handleLogAiItem}
              onLogAllAiItems={handleLogAllAiItems}
              bottomInset={insets.bottom}
              t={t}
            />
          )}

          {/* TAB 3: AI DESCRIBE */}
          {activeTab === 'describe' && (
            <AddFoodAiDescribeSection
              hasApiKey={hasApiKey}
              onKeyChanged={checkApiKey}
              describeText={describeText}
              onDescribeTextChange={setDescribeText}
              describeLoading={describeLoading}
              describeError={describeError}
              onEstimateDescribe={handleEstimateDescribe}
              describeResult={describeResult}
              selectedMeal={selectedMeal}
              targetDate={date}
              onLogAiItem={handleLogAiItem}
              onLogAllAiItems={handleLogAllAiItems}
              bottomInset={insets.bottom}
              t={t}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  </Modal>

    {/* Custom Food Creation Modal */}
    <AddFoodCustomModal
      visible={customModalVisible}
      onClose={() => setCustomModalVisible(false)}
      customName={customName}
      setCustomName={setCustomName}
      customServing={customServing}
      setCustomServing={setCustomServing}
      customCalories={customCalories}
      setCustomCalories={setCustomCalories}
      customProtein={customProtein}
      setCustomProtein={setCustomProtein}
      customCarbs={customCarbs}
      setCustomCarbs={setCustomCarbs}
      customFat={customFat}
      setCustomFat={setCustomFat}
      customError={customError}
      onSave={handleSaveCustomFood}
      language={language}
      t={t}
    />

    {/* Quick Add Calories Modal */}
    <AddFoodQuickAddModal
      visible={quickAddModalVisible}
      onClose={() => setQuickAddModalVisible(false)}
      selectedMeal={selectedMeal}
      quickAddName={quickAddName}
      setQuickAddName={setQuickAddName}
      quickAddCalories={quickAddCalories}
      setQuickAddCalories={setQuickAddCalories}
      quickAddProtein={quickAddProtein}
      setQuickAddProtein={setQuickAddProtein}
      quickAddCarbs={quickAddCarbs}
      setQuickAddCarbs={setQuickAddCarbs}
      quickAddFat={quickAddFat}
      setQuickAddFat={setQuickAddFat}
      quickAddError={quickAddError}
      onSave={handleQuickAddSave}
      language={language}
      t={t}
    />

    {/* Meal Template Creation Modal */}
    <AddFoodTemplateModal
      visible={templateModalVisible}
      onClose={() => setTemplateModalVisible(false)}
      selectedMeal={selectedMeal}
      currentDayMeals={currentDayMeals}
      templateName={templateName}
      setTemplateName={setTemplateName}
      templateError={templateError}
      templateSaving={templateSaving}
      onSave={handleCreateTemplateFromCurrentMeals}
      language={language}
      t={t}
    />

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

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
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
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    alignSelf: 'center',
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerContext: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: theme.colors.textSecondary,
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
  listHeaderRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  listHeaderTitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  foodListItemSimple: {
    padding: 12,
  },
  foodListItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  foodListItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingStart: 12,
    paddingEnd: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemKcal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  itemRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginStart: 8,
  },
  favStarBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverySection: {
    width: '100%',
    gap: 6,
    marginBottom: 10,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  discoverySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: theme.colors.textInverted,
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  emptyStateText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
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
  onlineAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.orangeLight,
    borderWidth: 1,
    borderColor: theme.colors.orangeBorder,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginTop: 8,
    width: '100%',
  },
  onlineAlertText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.orangeDeep,
    lineHeight: 16,
  },
  onlineOfflineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  onlineOfflineText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cachedBadgeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  openFoodFactsCreditText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  incompleteItemBadge: {
    backgroundColor: theme.colors.orangeLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.orangeBorder,
  },
  incompleteItemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.orangeDeep,
  },
  });
