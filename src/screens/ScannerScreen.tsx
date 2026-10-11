import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  FlatList
} from 'react-native';
import { AppText as Text } from '../components/AppText';
import {
  ArrowLeft,
  Barcode as BarcodeIcon,
  Camera as CameraIcon,
  Search,
  CheckCircle,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Sparkles,
  Key,
  Info,
  Utensils,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LoggedMeal, MealType, FoodItem } from '../types';
import { VERIFIED_FOOD_DATABASE } from '../data/foodDatabase';
import { lookupBarcodeWithFallbacks } from '../services/barcodeService';
import {
  analyzeMealImage,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  PlateAnalysisResult,
  PlateAnalysisItem,
} from '../services/plateAnalysisService';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ScannerScreenProps {
  onBack: () => void;
  onAddMeal: (meal: LoggedMeal) => void;
}

type ScanMode = 'menu' | 'live_barcode' | 'manual_barcode' | 'plate_photo' | 'food_search';

interface EditablePlateItem extends PlateAnalysisItem {
  multiplier: number;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onBack,
  onAddMeal,
}) => {
  const [mode, setMode] = useState<ScanMode>('menu');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');

  // Barcode Scanning State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedFood, setMatchedFood] = useState<FoodItem | null>(null);
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [servings, setServings] = useState(1);
  const [isLoggedBarcode, setIsLoggedBarcode] = useState(false);
  const [hasScannedCode, setHasScannedCode] = useState(false);

  // Plate Photo State
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [plateStatus, setPlateStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [plateResult, setPlateResult] = useState<PlateAnalysisResult | null>(null);
  const [editablePlateItems, setEditablePlateItems] = useState<EditablePlateItem[]>([]);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoggedPlate, setIsLoggedPlate] = useState(false);

  // Food Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedFood, setSearchedFood] = useState<FoodItem | null>(null);
  const [searchServings, setSearchServings] = useState(1);
  const [isLoggedSearch, setIsLoggedSearch] = useState(false);

  useEffect(() => {
    async function checkKey() {
      const k = await getStoredGeminiApiKey();
      setHasApiKey(Boolean(k));
      if (k) setGeminiKeyInput(k);
    }
    checkKey();
  }, []);

  // --- BARCODE LOOKUP HANDLERS ---
  const handlePerformBarcodeLookup = async (codeToLookup: string) => {
    const raw = codeToLookup.trim();
    if (!raw) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBarcodeStatus('searching');
    setBarcodeError(null);

    try {
      const food = await lookupBarcodeWithFallbacks(raw);
      setMatchedFood(food);
      setBarcodeStatus('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setMatchedFood(null);
      setBarcodeStatus('error');
      setBarcodeError(err?.message || 'Could not locate food product.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScannedCode || barcodeStatus === 'searching') return;
    setHasScannedCode(true);
    setBarcodeInput(data);
    setMode('manual_barcode');
    handlePerformBarcodeLookup(data);
  };

  const handleStartLiveScan = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Live barcode scanning requires camera permission. You can still look up any barcode manually.',
          [{ text: 'Use Manual Lookup', onPress: () => setMode('manual_barcode') }]
        );
        return;
      }
    }
    setHasScannedCode(false);
    setMode('live_barcode');
  };

  const handleLogBarcodeProduct = () => {
    if (!matchedFood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLoggedBarcode(true);

    const meal: LoggedMeal = {
      id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: matchedFood.id,
      name: matchedFood.name,
      brand: matchedFood.brand,
      category: matchedFood.category,
      mealType: selectedMeal,
      servings: servings,
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
      setIsLoggedBarcode(false);
      onBack();
    }, 600);
  };

  // --- PLATE PHOTO HANDLERS ---
  const handlePickPlateImage = async (fromCamera: boolean) => {
    setPlateError(null);
    setPlateResult(null);
    setEditablePlateItems([]);

    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert('Camera Access', 'Camera permission is required to photograph your meal.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
    } else {
      const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPerm.granted) {
        Alert.alert('Photo Access', 'Gallery access is required to choose a meal photo.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
    }

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    setSelectedImageUri(asset.uri);
    setMode('plate_photo');

    if (!asset.base64) {
      setPlateError('Could not process photo data. Please try again.');
      return;
    }

    runPlateAnalysis(asset.base64);
  };

  const runPlateAnalysis = async (base64: string) => {
    setPlateStatus('analyzing');
    setPlateError(null);

    try {
      const analysis = await analyzeMealImage(base64);
      setPlateResult(analysis);
      setEditablePlateItems(analysis.items.map((it) => ({ ...it, multiplier: 1 })));
      setPlateStatus('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setPlateStatus('error');
      setPlateError(err?.message || 'Could not analyze meal image.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const handleUpdateItemMultiplier = (index: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditablePlateItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newMultiplier = Math.max(0.25, Math.round((item.multiplier + delta) * 100) / 100);
        return { ...item, multiplier: newMultiplier };
      })
    );
  };

  const handleSaveGeminiKey = async () => {
    await setStoredGeminiApiKey(geminiKeyInput);
    setHasApiKey(Boolean(geminiKeyInput.trim()));
    setShowKeyModal(false);
    Alert.alert('Saved', 'Gemini API Key saved for photo meal analysis.');
  };

  const handleLogAnalyzedPlate = () => {
    if (editablePlateItems.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLoggedPlate(true);

    editablePlateItems.forEach((item, idx) => {
      const m = item.multiplier;
      const meal: LoggedMeal = {
        id: `plate_${Date.now()}_${idx}`,
        foodId: `ai_plate_${idx}`,
        name: item.name,
        mealType: selectedMeal,
        servings: m,
        servingSize: item.portionEstimate,
        servingGrams: Math.round(item.grams * m),
        calories: Math.round(item.calories * m),
        protein: Math.round(item.protein * m * 10) / 10,
        carbs: Math.round(item.carbs * m * 10) / 10,
        fat: Math.round(item.fat * m * 10) / 10,
        timestamp: new Date().toISOString(),
      };
      onAddMeal(meal);
    });

    setTimeout(() => {
      setIsLoggedPlate(false);
      onBack();
    }, 600);
  };

  // --- FOOD SEARCH HANDLERS ---
  const filteredFoods = VERIFIED_FOOD_DATABASE.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLogSearchedFood = () => {
    if (!searchedFood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLoggedSearch(true);

    const meal: LoggedMeal = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: searchedFood.id,
      name: searchedFood.name,
      brand: searchedFood.brand,
      category: searchedFood.category,
      mealType: selectedMeal,
      servings: searchServings,
      servingSize: searchedFood.servingSize,
      servingGrams: Math.round(searchedFood.servingGrams * searchServings),
      calories: Math.round(searchedFood.calories * searchServings),
      protein: Math.round(searchedFood.protein * searchServings * 10) / 10,
      carbs: Math.round(searchedFood.carbs * searchServings * 10) / 10,
      fat: Math.round(searchedFood.fat * searchServings * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal);
    setTimeout(() => {
      setIsLoggedSearch(false);
      onBack();
    }, 600);
  };

  // Totals for plate analysis with adjusted multipliers
  const currentTotalCalories = editablePlateItems.reduce(
    (sum, it) => sum + Math.round(it.calories * it.multiplier),
    0
  );
  const currentTotalProtein = Math.round(
    editablePlateItems.reduce((sum, it) => sum + it.protein * it.multiplier, 0) * 10
  ) / 10;
  const currentTotalCarbs = Math.round(
    editablePlateItems.reduce((sum, it) => sum + it.carbs * it.multiplier, 0) * 10
  ) / 10;
  const currentTotalFat = Math.round(
    editablePlateItems.reduce((sum, it) => sum + it.fat * it.multiplier, 0) * 10
  ) / 10;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (mode !== 'menu') {
              setMode('menu');
            } else {
              onBack();
            }
          }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'menu'
            ? 'Log food'
            : mode === 'live_barcode'
            ? 'Scan barcode'
            : mode === 'manual_barcode'
            ? 'Barcode lookup'
            : mode === 'food_search'
            ? 'Food search'
            : 'Analyze meal photo'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* VIEW 1: FOOD LOGGING CHOOSER */}
      {mode === 'menu' && (
        <ScrollView contentContainerStyle={styles.menuContent}>
          <Text style={styles.menuIntro}>
            Select how you would like to record your nutrition:
          </Text>

          {/* Option 1: Barcode Scanning */}
          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIconBox}>
                <BarcodeIcon size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionHeading}>Scan barcode</Text>
                <Text style={styles.optionSub}>
                  Use your camera on packaged goods or type the UPC/EAN code directly.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleStartLiveScan}
                activeOpacity={0.8}
              >
                <CameraIcon size={15} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>Scan with camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setMode('manual_barcode')}
                activeOpacity={0.7}
              >
                <Search size={14} color={theme.colors.textPrimary} />
                <Text style={styles.secondaryActionText}>Enter digits</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Option 2: AI Meal Photo Analysis */}
          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.accentLight }]}>
                <Sparkles size={20} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionHeading}>Analyze meal photo</Text>
                <Text style={styles.optionSub}>
                  Estimate nutrition from a photo of home-cooked plates or restaurant dishes.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.colors.accent }]}
                onPress={() => handlePickPlateImage(true)}
                activeOpacity={0.8}
              >
                <CameraIcon size={15} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>Take plate photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => handlePickPlateImage(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryActionText}>From gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Provider notice & key setup */}
            <View style={styles.providerNotice}>
              <Info size={14} color={theme.colors.textMuted} />
              <Text style={styles.providerText}>
                {hasApiKey
                  ? 'Gemini Vision key configured.'
                  : 'Requires Google Gemini Vision key for on-device analysis.'}
              </Text>
              <TouchableOpacity onPress={() => setShowKeyModal(true)}>
                <Text style={styles.providerKeyLink}>{hasApiKey ? 'Change key' : 'Setup key'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Option 3: Manual Food Search */}
          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.secondaryLight }]}>
                <Utensils size={18} color={theme.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionHeading}>Manual food search</Text>
                <Text style={styles.optionSub}>
                  Look up whole foods and verified ingredients from the local database.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setSearchQuery('');
                  setSearchedFood(null);
                  setSearchServings(1);
                  setMode('food_search');
                }}
                activeOpacity={0.8}
              >
                <Search size={15} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>Search food database</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* VIEW 2: LIVE CAMERA BARCODE SCANNER */}
      {mode === 'live_barcode' && (
        <View style={styles.cameraContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.webFallbackContainer}>
              <AlertTriangle size={32} color={theme.colors.accent} />
              <Text style={styles.webFallbackTitle}>Web Browser Camera</Text>
              <Text style={styles.webFallbackBody}>
                Live video barcode scanning requires native mobile camera hardware. Use manual barcode entry below to look up any product immediately.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => setMode('manual_barcode')}
              >
                <Text style={styles.primaryActionText}>Switch to Barcode Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.reticleFrame} />
                <Text style={styles.overlayInstruction}>
                  Align package barcode within the frame
                </Text>
                <TouchableOpacity
                  style={styles.cancelOverlayBtn}
                  onPress={() => setMode('manual_barcode')}
                >
                  <Text style={styles.cancelOverlayText}>Enter Number Manually</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          )}
        </View>
      )}

      {/* VIEW 3: MANUAL BARCODE LOOKUP */}
      {mode === 'manual_barcode' && (
        <ScrollView contentContainerStyle={styles.subContent}>
          <View style={styles.inputCard}>
            <Text style={styles.inputCardLabel}>Enter Barcode (UPC / EAN)</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 011110001027 or 748927028669"
                placeholderTextColor={theme.colors.textMuted}
                value={barcodeInput}
                onChangeText={setBarcodeInput}
                keyboardType="numeric"
                returnKeyType="search"
                onSubmitEditing={() => handlePerformBarcodeLookup(barcodeInput)}
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchSubmitBtn}
                onPress={() => handlePerformBarcodeLookup(barcodeInput)}
              >
                <Search size={16} color={theme.colors.textInverted} />
              </TouchableOpacity>
            </View>
          </View>

          {barcodeStatus === 'searching' && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.statusText}>Querying Open Food Facts & verified database...</Text>
            </View>
          )}

          {barcodeStatus === 'error' && (
            <View style={styles.errorBox}>
              <AlertTriangle size={20} color={theme.colors.danger} />
              <Text style={styles.errorText}>{barcodeError}</Text>
            </View>
          )}

          {barcodeStatus === 'found' && matchedFood && (
            <View style={styles.resultCard}>
              <View style={styles.resultBadgeRow}>
                <View style={styles.matchBadge}>
                  <CheckCircle size={13} color={theme.colors.primary} />
                  <Text style={styles.matchBadgeText}>Verified Match</Text>
                </View>
                <Text style={styles.upcLabel}>UPC {matchedFood.barcode}</Text>
              </View>

              <Text style={styles.productName}>{matchedFood.name}</Text>
              {matchedFood.brand ? <Text style={styles.brandSubtitle}>{matchedFood.brand}</Text> : null}

              <View style={styles.portionInfo}>
                <Text style={styles.portionText}>
                  {matchedFood.servingSize} ({matchedFood.servingGrams}g)
                </Text>
                <Text style={styles.kcalHighlight}>
                  {Math.round(matchedFood.calories * servings)} kcal
                </Text>
              </View>

              {/* Servings Stepper */}
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Portion Servings:</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
                  >
                    <Minus size={14} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepCount}>{servings}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setServings((s) => s + 0.5)}
                  >
                    <Plus size={14} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meal Category Selection */}
              <View style={styles.chipsRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, selectedMeal === m && styles.chipActive]}
                    onPress={() => setSelectedMeal(m)}
                  >
                    <Text style={[styles.chipText, selectedMeal === m && styles.chipTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, isLoggedBarcode && { backgroundColor: theme.colors.primaryHover }]}
                onPress={handleLogBarcodeProduct}
              >
                <Check size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>
                  {isLoggedBarcode ? 'Logged to Diary' : 'Add to Food Diary'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* VIEW 4: MEAL PHOTO REVIEW WITH EDITABLE PORTION CONTROLS */}
      {mode === 'plate_photo' && (
        <ScrollView contentContainerStyle={styles.subContent}>
          {selectedImageUri && (
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
          )}

          {plateStatus === 'analyzing' && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.statusText}>Analyzing meal components and portions...</Text>
            </View>
          )}

          {plateStatus === 'error' && (
            <View style={styles.errorBox}>
              <AlertTriangle size={20} color={theme.colors.accent} />
              <Text style={styles.errorText}>{plateError}</Text>
              {!hasApiKey && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 12 }]}
                  onPress={() => setShowKeyModal(true)}
                >
                  <Key size={15} color={theme.colors.textInverted} />
                  <Text style={styles.primaryActionText}>Configure Gemini API Key</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {plateStatus === 'done' && plateResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultBadgeRow}>
                <View style={[styles.matchBadge, { backgroundColor: theme.colors.accentLight }]}>
                  <Sparkles size={13} color={theme.colors.accent} />
                  <Text style={[styles.matchBadgeText, { color: theme.colors.accent }]}>
                    Visual AI Estimate
                  </Text>
                </View>
              </View>

              <Text style={styles.productName}>{plateResult.mealName}</Text>

              {/* Dynamic Nutrition Totals Banner */}
              <View style={styles.nutritionBanner}>
                <Text style={styles.nutritionBannerTitle}>
                  Estimated Total: {currentTotalCalories} kcal
                </Text>
                <Text style={styles.nutritionBannerSub}>
                  Protein: {currentTotalProtein}g • Carbs: {currentTotalCarbs}g • Fat: {currentTotalFat}g
                </Text>
              </View>

              {/* Detected Plate Items with Editable Portion Controls */}
              <Text style={styles.detectedHeading}>Detected items (Adjust portions below):</Text>
              {editablePlateItems.map((it, idx) => {
                const itemKcal = Math.round(it.calories * it.multiplier);
                const itemGrams = Math.round(it.grams * it.multiplier);

                return (
                  <View key={idx} style={styles.plateItemCard}>
                    <View style={styles.plateItemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.plateItemName}>{it.name}</Text>
                        <Text style={styles.plateItemPortion}>
                          {it.portionEstimate} (~{itemGrams}g)
                        </Text>
                      </View>
                      <Text style={styles.plateItemKcal}>{itemKcal} kcal</Text>
                    </View>

                    {/* Editable Portion Controls */}
                    <View style={styles.itemMultiplierRow}>
                      <Text style={styles.portionAdjustLabel}>Portion scale:</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleUpdateItemMultiplier(idx, -0.25)}
                          accessibilityLabel={`Decrease portion for ${it.name}`}
                        >
                          <Minus size={13} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.stepCount}>{it.multiplier}x</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleUpdateItemMultiplier(idx, 0.25)}
                          accessibilityLabel={`Increase portion for ${it.name}`}
                        >
                          <Plus size={13} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              <Text style={styles.disclaimerText}>{plateResult.disclaimer}</Text>

              {/* Meal Slot Selection */}
              <View style={styles.chipsRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, selectedMeal === m && styles.chipActive]}
                    onPress={() => setSelectedMeal(m)}
                  >
                    <Text style={[styles.chipText, selectedMeal === m && styles.chipTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, isLoggedPlate && { backgroundColor: theme.colors.primaryHover }]}
                onPress={handleLogAnalyzedPlate}
              >
                <Check size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>
                  {isLoggedPlate ? 'Logged to Diary' : 'Confirm & Log All Items'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* VIEW 5: MANUAL FOOD SEARCH FLOW */}
      {mode === 'food_search' && (
        <View style={styles.searchFlowContainer}>
          <View style={styles.searchHeaderBox}>
            <View style={styles.searchRow}>
              <Search size={16} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Search food by name or category..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={!searchedFood}
              />
            </View>
          </View>

          {searchedFood ? (
            <ScrollView contentContainerStyle={styles.subContent}>
              <View style={styles.resultCard}>
                <View style={styles.resultBadgeRow}>
                  <View style={styles.matchBadge}>
                    <Utensils size={13} color={theme.colors.primary} />
                    <Text style={styles.matchBadgeText}>{searchedFood.category || 'Database'}</Text>
                  </View>
                </View>

                <Text style={styles.productName}>{searchedFood.name}</Text>
                {searchedFood.brand ? <Text style={styles.brandSubtitle}>{searchedFood.brand}</Text> : null}

                <View style={styles.portionInfo}>
                  <Text style={styles.portionText}>
                    {searchedFood.servingSize} ({Math.round(searchedFood.servingGrams * searchServings)}g)
                  </Text>
                  <Text style={styles.kcalHighlight}>
                    {Math.round(searchedFood.calories * searchServings)} kcal
                  </Text>
                </View>

                {/* Macro Row */}
                <View style={styles.searchMacroRow}>
                  <Text style={styles.searchMacroText}>
                    P: {Math.round(searchedFood.protein * searchServings * 10) / 10}g
                  </Text>
                  <Text style={styles.searchMacroText}>
                    C: {Math.round(searchedFood.carbs * searchServings * 10) / 10}g
                  </Text>
                  <Text style={styles.searchMacroText}>
                    F: {Math.round(searchedFood.fat * searchServings * 10) / 10}g
                  </Text>
                </View>

                {/* Servings Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Portion Servings:</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setSearchServings((s) => Math.max(0.5, s - 0.5))}
                    >
                      <Minus size={14} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepCount}>{searchServings}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setSearchServings((s) => s + 0.5)}
                    >
                      <Plus size={14} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Meal Category Selection */}
                <View style={styles.chipsRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, selectedMeal === m && styles.chipActive]}
                      onPress={() => setSelectedMeal(m)}
                    >
                      <Text style={[styles.chipText, selectedMeal === m && styles.chipTextActive]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => setSearchedFood(null)}
                  >
                    <Text style={styles.secondaryActionText}>Choose Different Food</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, isLoggedSearch && { backgroundColor: theme.colors.primaryHover }]}
                    onPress={handleLogSearchedFood}
                  >
                    <Check size={16} color={theme.colors.textInverted} />
                    <Text style={styles.primaryActionText}>
                      {isLoggedSearch ? 'Logged to Diary' : 'Add to Diary'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.foodListItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSearchedFood(item);
                    setSearchServings(1);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodItemName}>{item.name}</Text>
                    <Text style={styles.foodItemServing}>
                      {item.servingSize} • {item.calories} kcal
                    </Text>
                  </View>
                  <View style={styles.selectCircle}>
                    <Plus size={14} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No foods found</Text>
                  <Text style={styles.emptyStateSub}>
                    Try searching for ingredients like "egg", "chicken", "rice", or "apple".
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* GEMINI KEY CONFIGURATION MODAL */}
      {showKeyModal && (
        <View style={styles.keyDialogBackdrop}>
          <View style={styles.keyDialogCard}>
            <Text style={styles.keyDialogTitle}>Google Gemini API Key</Text>
            <Text style={styles.keyDialogSub}>
              To analyze meal photos on-device without exposing secrets, provide your free Google Gemini API key:
            </Text>

            <TextInput
              style={styles.keyInput}
              placeholder="AIzaSy..."
              placeholderTextColor={theme.colors.textMuted}
              value={geminiKeyInput}
              onChangeText={setGeminiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.keyDialogActions}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setShowKeyModal(false)}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveGeminiKey}
              >
                <Text style={styles.primaryActionText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  menuContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
    gap: 16,
  },
  menuIntro: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  optionBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  optionHeader: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionHeading: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  optionSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    ...theme.shadow.subtle,
  },
  primaryActionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  secondaryActionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  providerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  providerText: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
    flex: 1,
  },
  providerKeyLink: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reticleFrame: {
    width: 260,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  overlayInstruction: {
    fontFamily: theme.fonts.sans,
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 20,
    fontWeight: '500',
  },
  cancelOverlayBtn: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radius.full,
  },
  cancelOverlayText: {
    fontFamily: theme.fonts.sans,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: theme.colors.surface,
  },
  webFallbackTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  webFallbackBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  subContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  inputCardLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    fontFamily: theme.fonts.sans,
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  searchSubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 12,
  },
  statusText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  errorBox: {
    padding: 16,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 12,
  },
  errorText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.danger,
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  matchBadgeText: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  upcLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  productName: {
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  portionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  portionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  kcalHighlight: {
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepperLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    minWidth: 36,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
  },
  nutritionBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nutritionBannerTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  nutritionBannerSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  detectedHeading: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plateItemCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  plateItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateItemName: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  plateItemPortion: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  plateItemKcal: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  itemMultiplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  portionAdjustLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  disclaimerText: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
    marginVertical: 12,
  },
  searchFlowContainer: {
    flex: 1,
  },
  searchHeaderBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  foodListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  foodItemName: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  foodItemServing: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMacroRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  searchMacroText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  emptyStateSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  keyDialogBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  keyDialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.floating,
  },
  keyDialogTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  keyDialogSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  keyInput: {
    fontFamily: theme.fonts.sans,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  keyDialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
