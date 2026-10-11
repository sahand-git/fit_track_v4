import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
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
  RefreshCw,
  Info,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LoggedMeal, MealType, FoodItem } from '../types';
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

type ScanMode = 'menu' | 'live_barcode' | 'manual_barcode' | 'plate_photo';

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
  const [plateError, setPlateError] = useState<string | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoggedPlate, setIsLoggedPlate] = useState(false);

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
      setIsLoggedBarcode(false);
      onBack();
    }, 600);
  };

  // --- PLATE PHOTO HANDLERS ---
  const handlePickPlateImage = async (fromCamera: boolean) => {
    setPlateError(null);
    setPlateResult(null);

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
      setPlateStatus('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setPlateStatus('error');
      setPlateError(err?.message || 'Could not analyze meal image.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const handleSaveGeminiKey = async () => {
    await setStoredGeminiApiKey(geminiKeyInput);
    setHasApiKey(Boolean(geminiKeyInput.trim()));
    setShowKeyModal(false);
    Alert.alert('Saved', 'Gemini API Key saved for photo meal analysis.');
  };

  const handleLogAnalyzedPlate = () => {
    if (!plateResult || plateResult.items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLoggedPlate(true);

    plateResult.items.forEach((item, idx) => {
      const meal: LoggedMeal = {
        id: `plate_${Date.now()}_${idx}`,
        foodId: `ai_plate_${idx}`,
        name: item.name,
        mealType: selectedMeal,
        servings: 1,
        servingSize: item.portionEstimate,
        servingGrams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        timestamp: new Date().toISOString(),
      };
      onAddMeal(meal);
    });

    setTimeout(() => {
      setIsLoggedPlate(false);
      onBack();
    }, 600);
  };

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
            ? 'Food Scanner'
            : mode === 'live_barcode'
            ? 'Live Camera Scanner'
            : mode === 'manual_barcode'
            ? 'Barcode Lookup'
            : 'Meal Photo Analysis'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* VIEW 1: SELECTION MENU */}
      {mode === 'menu' && (
        <ScrollView contentContainerStyle={styles.menuContent}>
          <Text style={styles.menuIntro}>
            Choose how you would like to log food:
          </Text>

          {/* Option A: Barcode Scanning */}
          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={styles.optionIconBox}>
                <BarcodeIcon size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionHeading}>Packaged Food Barcode</Text>
                <Text style={styles.optionSub}>
                  Scan UPC barcode on packaging or enter digits manually.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleStartLiveScan}
                activeOpacity={0.8}
              >
                <CameraIcon size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>Scan Live with Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setMode('manual_barcode')}
                activeOpacity={0.7}
              >
                <Search size={15} color={theme.colors.textPrimary} />
                <Text style={styles.secondaryActionText}>Enter Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Option B: AI Meal Photo Analysis */}
          <View style={styles.optionBlock}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.accentLight }]}>
                <Sparkles size={20} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionHeading}>Meal Photo Analysis</Text>
                <Text style={styles.optionSub}>
                  Estimate nutrition from a photo of home-cooked plates or restaurant meals.
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.colors.accent }]}
                onPress={() => handlePickPlateImage(true)}
                activeOpacity={0.8}
              >
                <CameraIcon size={16} color={theme.colors.textInverted} />
                <Text style={styles.primaryActionText}>Take Plate Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => handlePickPlateImage(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryActionText}>Choose from Gallery</Text>
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
                <Text style={styles.providerKeyLink}>{hasApiKey ? 'Change Key' : 'Setup Key'}</Text>
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
                placeholder="e.g. 011110001027 or 894700010328"
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

      {/* VIEW 4: AI PLATE PHOTO ANALYSIS */}
      {mode === 'plate_photo' && (
        <ScrollView contentContainerStyle={styles.subContent}>
          {selectedImageUri && (
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
          )}

          {plateStatus === 'analyzing' && (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.statusText}>Analyzing plate components and portions with AI...</Text>
            </View>
          )}

          {plateStatus === 'error' && (
            <View style={styles.errorBox}>
              <AlertTriangle size={20} color={theme.colors.accent} />
              <Text style={styles.errorText}>{plateError}</Text>
              {!hasApiKey && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 10 }]}
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
              <Text style={styles.totalKcalBanner}>
                Estimated Total: {plateResult.totalCalories} kcal (P: {plateResult.totalProtein}g • C: {plateResult.totalCarbs}g • F: {plateResult.totalFat}g)
              </Text>

              <Text style={styles.detectedHeading}>Detected Plate Items (Confirm below):</Text>
              {plateResult.items.map((it, idx) => (
                <View key={idx} style={styles.plateItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plateItemName}>{it.name}</Text>
                    <Text style={styles.plateItemPortion}>
                      Est: {it.portionEstimate} (~{it.grams}g)
                    </Text>
                  </View>
                  <Text style={styles.plateItemKcal}>{it.calories} kcal</Text>
                </View>
              ))}

              <Text style={styles.disclaimerText}>{plateResult.disclaimer}</Text>

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

      {/* GEMINI KEY CONFIGURATION DIALOG */}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  menuContent: {
    padding: theme.spacing.md,
    gap: 16,
  },
  menuIntro: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  optionBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
    ...theme.shadow.subtle,
  },
  optionHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  providerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  providerText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  providerKeyLink: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reticleFrame: {
    width: 260,
    height: 180,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlayInstruction: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
  },
  cancelOverlayBtn: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelOverlayText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  webFallbackContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  webFallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  webFallbackBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  subContent: {
    padding: theme.spacing.md,
    gap: 14,
    paddingBottom: 40,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  searchSubmitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.subtle,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  upcLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  brandSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  portionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  portionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  kcalHighlight: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    gap: 8,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  chip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingVertical: 7,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  totalKcalBanner: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  detectedHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  plateItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  plateItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  plateItemPortion: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  plateItemKcal: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  disclaimerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  keyDialogBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    padding: 20,
  },
  keyDialogCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: 12,
  },
  keyDialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  keyDialogSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  keyInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  keyDialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
