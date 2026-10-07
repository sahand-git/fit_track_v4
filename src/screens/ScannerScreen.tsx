import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  TextInput,
} from 'react-native';
import {
  ArrowLeft,
  X,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Keyboard,
  CheckCircle,
  Plus,
  Minus,
  Utensils,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react-native';
import { LoggedMeal, MealType } from '../types';
import * as Haptics from 'expo-haptics';

interface ScannerScreenProps {
  onBack: () => void;
  onAddMeal: (meal: LoggedMeal) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onBack,
  onAddMeal,
}) => {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [servings, setServings] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [isLogged, setIsLogged] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Animated laser beam
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsFlashOn((prev) => !prev);
  };

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setServings((s) => Math.min(10, s + 1));
  };

  const handleDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setServings((s) => Math.max(1, s - 1));
  };

  const handleLogProduct = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsLogged(true);

    const meal: LoggedMeal = {
      id: `scanned_${Date.now()}`,
      foodId: 'food_scanned_berry_yogurt',
      name: 'Chobani® Greek Mixed Berry Yogurt',
      mealType: selectedMeal,
      servings,
      servingSize: '1 cup (150g)',
      servingGrams: 150 * servings,
      calories: 120 * servings,
      protein: 12 * servings,
      carbs: 14 * servings,
      fat: 0 * servings,
      timestamp: new Date().toISOString(),
    };

    onAddMeal(meal);

    setTimeout(() => {
      setIsLogged(false);
      onBack();
    }, 1200);
  };

  const laserTranslate = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <ArrowLeft size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Scanner</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <X size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Viewfinder Section */}
      <View style={styles.viewfinder}>
        {/* Dark Vignette & Backdrop */}
        <View style={styles.cameraBackdrop}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
            }}
            style={styles.cameraImage}
          />
          <View style={styles.cameraOverlay} />
        </View>

        {/* Top Controls on Camera */}
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[styles.cameraActionBtn, isFlashOn && styles.cameraActionBtnActive]}
            onPress={toggleFlash}
          >
            {isFlashOn ? <ZapOff size={16} color="#090D16" /> : <Zap size={16} color="#F8FAFC" />}
            <Text style={[styles.cameraActionText, isFlashOn && styles.cameraActionTextActive]}>
              {isFlashOn ? 'Flash On' : 'Flash'}
            </Text>
          </TouchableOpacity>

          <View style={styles.cameraRightControls}>
            <TouchableOpacity style={styles.iconCircleBtn}>
              <ImageIcon size={18} color="#F8FAFC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={() => setShowManualInput(!showManualInput)}
            >
              <Keyboard size={16} color="#F8FAFC" />
              <Text style={styles.cameraActionText}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reticle Target Window */}
        <View style={styles.reticle}>
          {/* Glowing Corners */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated Scanning Laser Beam */}
          <Animated.View
            style={[
              styles.laser,
              { transform: [{ translateY: laserTranslate }] },
            ]}
          />

          {/* Scanning Live Badge */}
          <View style={styles.scanningBadge}>
            <View style={styles.pingDot} />
            <Text style={styles.scanningBadgeText}>SCANNING LIVE</Text>
          </View>
        </View>

        {/* Helper Capsule */}
        <View style={styles.instructionCapsule}>
          <QrCode size={16} color="#FA5D29" />
          <Text style={styles.instructionText}>Align barcode within frame</Text>
        </View>
      </View>

      {/* Manual Input Card (Optional) */}
      {showManualInput && (
        <View style={styles.manualInputCard}>
          <TextInput
            style={styles.manualInputField}
            placeholder="Enter 12-digit UPC barcode..."
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={manualCode}
            onChangeText={setManualCode}
          />
          <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleLogProduct}>
            <Text style={styles.manualSubmitBtnText}>Look Up</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detected Product Match Card (Stitch Elevation) */}
      <View style={styles.matchCard}>
        {/* Card Header: Match Badge & UPC */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.matchBadge}>
            <CheckCircle size={15} color="#00714D" />
            <Text style={styles.matchBadgeText}>100% Barcode Match</Text>
          </View>
          <Text style={styles.upcText}>UPC 8-94700-01032</Text>
        </View>

        {/* Product Identity */}
        <View style={styles.productRow}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=200&q=80',
            }}
            style={styles.productThumbnail}
          />
          <View style={styles.productInfo}>
            <Text style={styles.brandTitle}>CHOBANI® GREEK</Text>
            <Text style={styles.productName} numberOfLines={1}>
              Mixed Berry Yogurt
            </Text>
            <Text style={styles.portionSubtitle}>Single Serve • 1 cup (150g)</Text>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieNumber}>{120 * servings}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
              <Text style={styles.calorieDailyPct}>6% Daily Limit</Text>
            </View>
          </View>
        </View>

        {/* Macro Nutrients Pill Grid */}
        <View style={styles.macroPillGrid}>
          <View style={styles.macroPill}>
            <View style={styles.macroPillHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#006C49' }]} />
              <Text style={styles.macroPillLabel}>PROTEIN</Text>
            </View>
            <Text style={styles.macroPillVal}>
              {12 * servings}
              <Text style={styles.macroPillValUnit}>g</Text>
            </Text>
            <Text style={[styles.macroPillSub, { color: '#006C49' }]}>40% cals</Text>
          </View>

          <View style={styles.macroPill}>
            <View style={styles.macroPillHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#FA5D29' }]} />
              <Text style={styles.macroPillLabel}>CARBS</Text>
            </View>
            <Text style={styles.macroPillVal}>
              {14 * servings}
              <Text style={styles.macroPillValUnit}>g</Text>
            </Text>
            <Text style={styles.macroPillSub}>46% cals</Text>
          </View>

          <View style={styles.macroPill}>
            <View style={styles.macroPillHeader}>
              <View style={[styles.macroDot, { backgroundColor: '#3298DC' }]} />
              <Text style={styles.macroPillLabel}>FAT</Text>
            </View>
            <Text style={styles.macroPillVal}>
              {0 * servings}
              <Text style={styles.macroPillValUnit}>g</Text>
            </Text>
            <Text style={styles.macroPillSub}>0% cals</Text>
          </View>
        </View>

        {/* Meal Target & Stepper Drawer */}
        <View style={styles.stepperRow}>
          <View style={styles.stepperLeft}>
            <View style={styles.mealIconCircle}>
              <Utensils size={16} color="#FA5D29" />
            </View>
            <View>
              <Text style={styles.stepperSubLabel}>LOG INTO</Text>
              <Text style={styles.stepperMealLabel}>
                {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
              </Text>
            </View>
          </View>

          {/* Serving Stepper */}
          <View style={styles.stepperControls}>
            <TouchableOpacity style={styles.stepperBtn} onPress={handleDecrement}>
              <Minus size={15} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={styles.stepperCountText}>
              {servings === 1 ? '1 cup' : `${servings} cups`}
            </Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={handleIncrement}>
              <Plus size={15} color="#FA5D29" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Meal Category Switcher Chips */}
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

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.primaryLogBtn, isLogged && styles.primaryLogBtnSuccess]}
          onPress={handleLogProduct}
          activeOpacity={0.85}
        >
          {isLogged ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.primaryLogBtnText}>Logged to Food Diary!</Text>
            </>
          ) : (
            <>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.primaryLogBtnText}>Add to Food Diary</Text>
            </>
          )}
        </TouchableOpacity>

        {/* OpenFoodFacts Verification Tag */}
        <View style={styles.verifiedFootnote}>
          <Sparkles size={14} color="#10B981" />
          <Text style={styles.verifiedFootnoteText}>Verified OpenFoodFacts DB</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  viewfinder: {
    position: 'relative',
    width: '100%',
    height: 320,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  cameraBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraImage: {
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
  },
  cameraControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(19, 27, 46, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraActionBtnActive: {
    backgroundColor: '#FA5D29',
  },
  cameraActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  cameraActionTextActive: {
    color: '#090D16',
  },
  cameraRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(19, 27, 46, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 220,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FA5D29',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  laser: {
    width: 190,
    height: 2.5,
    backgroundColor: '#FA5D29',
    borderRadius: 2,
    shadowColor: '#FA5D29',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  scanningBadge: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131B2E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  scanningBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  instructionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  instructionText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  manualInputCard: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  manualInputField: {
    flex: 1,
    backgroundColor: '#131B2E',
    color: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  manualSubmitBtn: {
    backgroundColor: '#FA5D29',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  manualSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  matchCard: {
    backgroundColor: '#131B2E',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: 'rgba(0, 108, 73, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4EDEA3',
  },
  upcText: {
    fontSize: 11,
    color: '#64748B',
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  productThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  productInfo: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FA5D29',
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  portionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  calorieNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  calorieUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  calorieDailyPct: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 6,
  },
  macroPillGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  macroPillVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  macroPillValUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  macroPillSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250, 93, 41, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  stepperMealLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    minWidth: 44,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  mealChip: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mealChipActive: {
    borderColor: '#FA5D29',
    backgroundColor: 'rgba(250, 93, 41, 0.12)',
  },
  mealChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  mealChipTextActive: {
    color: '#FA5D29',
    fontWeight: '700',
  },
  primaryLogBtn: {
    backgroundColor: '#FA5D29',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FA5D29',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryLogBtnSuccess: {
    backgroundColor: '#10B981',
  },
  primaryLogBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  verifiedFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  verifiedFootnoteText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
});
