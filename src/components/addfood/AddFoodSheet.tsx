import React, { useState, useEffect } from 'react';
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
} from 'react-native';
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
  ChevronRight,
  Utensils,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LoggedMeal, MealType, FoodItem } from '../../types';
import { VERIFIED_FOOD_DATABASE } from '../../data/foodDatabase';
import { lookupBarcodeWithFallbacks } from '../../services/barcodeService';
import {
  analyzeMealImage,
  estimateMealFromText,
  getStoredGeminiApiKey,
  PlateAnalysisResult,
} from '../../services/plateAnalysisService';
import { GeminiKeyManager } from '../GeminiKeyManager';
import { AiReview } from './AiReview';
import { useLanguage } from '../../i18n/I18nContext';
import { translate } from '../../i18n/strings';
import { formatDisplayDate, getTodayDateString } from '../../utils/dateUtils';
import { theme } from '../../theme';
import * as Haptics from 'expo-haptics';

export interface AddFoodSheetProps {
  visible: boolean;
  onClose: () => void;
  mealType?: MealType;
  date: string;
  onAddMeal: (meal: LoggedMeal, targetDate: string) => void;
}

type TabMode = 'search' | 'photo' | 'describe';

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
  onAddMeal,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);

  const [activeTab, setActiveTab] = useState<TabMode>('search');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealType || getDefaultMealType());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingsCount, setServingsCount] = useState(1);

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

  const isToday = date === getTodayDateString();
  const isFuture = date > getTodayDateString();

  useEffect(() => {
    if (visible) {
      if (mealType) {
        setSelectedMeal(mealType);
      } else {
        setSelectedMeal(getDefaultMealType());
      }
      checkApiKey();
    }
  }, [visible, mealType]);

  const checkApiKey = async () => {
    const k = await getStoredGeminiApiKey();
    setHasApiKey(Boolean(k));
  };

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setBarcodeError(err?.message || t('Could not find food for this barcode.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setBarcodeLoading(false);
    }
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

    const meal: LoggedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      brand: selectedFood.brand,
      category: selectedFood.category,
      mealType: selectedMeal,
      servings: servingsCount,
      servingSize: selectedFood.servingSize,
      servingGrams: Math.round(selectedFood.servingGrams * servingsCount),
      calories: Math.round(selectedFood.calories * servingsCount),
      protein: Math.round(selectedFood.protein * servingsCount * 10) / 10,
      carbs: Math.round(selectedFood.carbs * servingsCount * 10) / 10,
      fat: Math.round(selectedFood.fat * servingsCount * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal, date);
    handleClose();
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
    setTimeout(() => {
      handleClose();
    }, 400);
  };

  // Filtered Food Search
  const filteredFoods = VERIFIED_FOOD_DATABASE.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const mealCategories: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: t('Breakfast') },
    { key: 'lunch', label: t('Lunch') },
    { key: 'dinner', label: t('Dinner') },
    { key: 'snack', label: t('Snacks') },
  ];

  const headerTitle = isToday
    ? `${t('Add food')} · ${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`
    : `${formatDisplayDate(date, language)} · ${t(selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1))}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={[styles.backdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
        <View style={styles.sheetContainer}>
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
                        onChangeText={setSearchQuery}
                        autoFocus={!selectedFood}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
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
                      <AlertTriangle size={15} color={theme.colors.danger} />
                      <Text style={styles.errorNoticeText}>{barcodeError}</Text>
                    </View>
                  )}

                  {/* Selected Food Adjustment Box */}
                  {selectedFood && (
                    <View style={styles.selectedFoodCard}>
                      <View style={styles.selectedTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selectedName}>{selectedFood.name}</Text>
                          {selectedFood.brand ? (
                            <Text style={styles.selectedBrand}>{selectedFood.brand}</Text>
                          ) : null}
                          <Text style={styles.selectedPortion}>
                            {selectedFood.servingSize} ({selectedFood.servingGrams}g)
                          </Text>
                        </View>
                        <Text style={styles.selectedKcal}>
                          {Math.round(selectedFood.calories * servingsCount)} kcal
                        </Text>
                      </View>

                      <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>{t('Servings:')}</Text>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => setServingsCount((c) => Math.max(0.5, c - 0.5))}
                          >
                            <Minus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.stepVal}>{servingsCount}</Text>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => setServingsCount((c) => c + 0.5)}
                          >
                            <Plus size={13} color={theme.colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.confirmAddBtn}
                        onPress={handleSaveSelectedFood}
                        accessibilityRole="button"
                      >
                        <Check size={16} color={theme.colors.textInverted} />
                        <Text style={styles.confirmAddBtnText}>{t('Log to Diary')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Foods List */}
                  <ScrollView
                    contentContainerStyle={styles.foodListScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredFoods.map((item) => (
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
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>{item.name}</Text>
                          <Text style={styles.itemSub}>
                            {item.servingSize} • P: {item.protein}g C: {item.carbs}g F: {item.fat}g
                          </Text>
                        </View>
                        <Text style={styles.itemKcal}>{item.calories} kcal</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {/* TAB 2: AI MEAL PHOTO */}
          {activeTab === 'photo' && (
            <ScrollView
              contentContainerStyle={styles.tabContentScroll}
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
                  >
                    <CameraIcon size={16} color={theme.colors.textInverted} />
                    <Text style={styles.photoPickBtnText}>{t('Take plate photo')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoPickBtnSecondary}
                    onPress={() => handlePickPhoto(false)}
                    activeOpacity={0.8}
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
              contentContainerStyle={styles.tabContentScroll}
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
                  result={describeResult}
                  mealType={selectedMeal}
                  targetDate={date}
                  onLogItem={handleLogAiItem}
                  onLogAll={handleLogAllAiItems}
                />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
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
  foodListScroll: {
    paddingTop: 8,
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
});
