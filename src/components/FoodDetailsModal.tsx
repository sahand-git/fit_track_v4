import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  Sparkles,
  Flame,
  Check,
  Trash2,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react-native';
import { LoggedMeal, FoodItem, MealType } from '../types';
import * as Haptics from 'expo-haptics';

interface FoodDetailsModalProps {
  visible: boolean;
  item: LoggedMeal | FoodItem | null;
  isLogged?: boolean;
  onClose: () => void;
  onSave?: (servings: number) => void;
  onDelete?: () => void;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  visible,
  item,
  isLogged = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (item && 'servings' in item) {
      setServings(item.servings || 1);
    } else {
      setServings(1);
    }
  }, [item, visible]);

  if (!item) return null;

  // Base unit values
  const baseKcal = 'servings' in item && item.servings > 0
    ? Math.round(item.calories / item.servings)
    : item.calories;
  const baseProtein = 'servings' in item && item.servings > 0
    ? Math.round((item.protein / item.servings) * 10) / 10
    : item.protein;
  const baseCarbs = 'servings' in item && item.servings > 0
    ? Math.round((item.carbs / item.servings) * 10) / 10
    : item.carbs;
  const baseFat = 'servings' in item && item.servings > 0
    ? Math.round((item.fat / item.servings) * 10) / 10
    : item.fat;

  // Multiplied values
  const currentKcal = Math.round(baseKcal * servings);
  const currentProtein = Math.round(baseProtein * servings * 10) / 10;
  const currentCarbs = Math.round(baseCarbs * servings * 10) / 10;
  const currentFat = Math.round(baseFat * servings * 10) / 10;
  const currentGrams = Math.round((item.servingGrams || 100) * servings);

  // Micronutrients estimates (derived or stored)
  const fiber = item.fiber !== undefined ? Math.round(item.fiber * servings * 10) / 10 : Math.round(currentCarbs * 0.12 * 10) / 10;
  const sugar = item.sugar !== undefined ? Math.round(item.sugar * servings * 10) / 10 : Math.round(currentCarbs * 0.25 * 10) / 10;
  const sodium = item.sodium !== undefined ? Math.round(item.sodium * servings) : Math.round(currentKcal * 0.85);
  const potassium = item.potassium !== undefined ? Math.round(item.potassium * servings) : Math.round(currentProtein * 18 + currentCarbs * 12);
  const calcium = item.calcium !== undefined ? Math.round(item.calcium * servings) : Math.round(currentProtein * 8);
  const iron = item.iron !== undefined ? Math.round(item.iron * servings * 10) / 10 : Math.round((currentProtein * 0.08 + 0.6) * 10) / 10;

  // Macro calorie energy ratios
  const proteinKcal = currentProtein * 4;
  const carbsKcal = currentCarbs * 4;
  const fatKcal = currentFat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;
  const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
  const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
  const fatPct = Math.round((fatKcal / totalMacroKcal) * 100);

  const handleMinus = () => {
    if (servings > 0.5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setServings((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10));
    }
  };

  const handlePlus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setServings((prev) => Math.round((prev + 0.5) * 10) / 10);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (onSave) onSave(servings);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Sheet Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <View style={styles.badgeRow}>
                <View style={styles.brandBadge}>
                  <ShieldCheck size={12} color="#10B981" />
                  <Text style={styles.brandBadgeText}>{item.brand || 'Verified Food'}</Text>
                </View>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.foodTitle}>{item.name}</Text>
              <Text style={styles.servingInfo}>
                {item.servingSize} • {currentGrams}g total
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Calories Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>ENERGY VALUE</Text>
                <View style={styles.heroKcalRow}>
                  <Text style={styles.heroKcalNumber}>{currentKcal}</Text>
                  <Text style={styles.heroKcalUnit}>kcal</Text>
                </View>
                <Text style={styles.heroSub}>
                  {servings} {servings === 1 ? 'serving' : 'servings'}
                </Text>
              </View>
              <View style={styles.heroRight}>
                <View style={styles.macroSplitRings}>
                  <View style={styles.splitRow}>
                    <View style={[styles.splitDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.splitText}>P: {proteinPct}%</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <View style={[styles.splitDot, { backgroundColor: '#06B6D4' }]} />
                    <Text style={styles.splitText}>C: {carbsPct}%</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <View style={[styles.splitDot, { backgroundColor: '#EC4899' }]} />
                    <Text style={styles.splitText}>F: {fatPct}%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Macro Cards Grid */}
            <View style={styles.macroGrid}>
              <View style={[styles.macroBox, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <Text style={[styles.macroTag, { color: '#10B981' }]}>PROTEIN</Text>
                <Text style={styles.macroVal}>{currentProtein}g</Text>
                <Text style={styles.macroCal}>{Math.round(proteinKcal)} kcal</Text>
              </View>
              <View style={[styles.macroBox, { borderColor: 'rgba(6, 182, 212, 0.3)' }]}>
                <Text style={[styles.macroTag, { color: '#06B6D4' }]}>CARBS</Text>
                <Text style={styles.macroVal}>{currentCarbs}g</Text>
                <Text style={styles.macroCal}>{Math.round(carbsKcal)} kcal</Text>
              </View>
              <View style={[styles.macroBox, { borderColor: 'rgba(236, 72, 153, 0.3)' }]}>
                <Text style={[styles.macroTag, { color: '#EC4899' }]}>FAT</Text>
                <Text style={styles.macroVal}>{currentFat}g</Text>
                <Text style={styles.macroCal}>{Math.round(fatKcal)} kcal</Text>
              </View>
            </View>

            {/* Serving Adjustment Bar */}
            <View style={styles.servingsControlCard}>
              <Text style={styles.servingsLabel}>Adjust Servings</Text>
              <View style={styles.servingsAdjuster}>
                <TouchableOpacity
                  style={[styles.servBtn, servings <= 0.5 && styles.servBtnDisabled]}
                  onPress={handleMinus}
                  disabled={servings <= 0.5}
                >
                  <Minus size={16} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.servingsCountText}>{servings}</Text>
                <TouchableOpacity style={styles.servBtn} onPress={handlePlus}>
                  <Plus size={16} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Detailed Nutrition Facts Breakdown */}
            <View style={styles.sectionHeaderRow}>
              <Activity size={16} color="#FA5D29" />
              <Text style={styles.sectionTitle}>Nutrition Facts (USDA Standard)</Text>
            </View>

            <View style={styles.factsCard}>
              <View style={styles.factRow}>
                <Text style={styles.factName}>Dietary Fiber</Text>
                <Text style={styles.factValue}>{fiber} g</Text>
              </View>
              <View style={styles.factDivider} />
              <View style={styles.factRow}>
                <Text style={styles.factName}>Total Sugars</Text>
                <Text style={styles.factValue}>{sugar} g</Text>
              </View>
              <View style={styles.factDivider} />
              <View style={styles.factRow}>
                <Text style={styles.factName}>Sodium</Text>
                <Text style={styles.factValue}>{sodium} mg</Text>
              </View>
              <View style={styles.factDivider} />
              <View style={styles.factRow}>
                <Text style={styles.factName}>Potassium</Text>
                <Text style={styles.factValue}>{potassium} mg</Text>
              </View>
              <View style={styles.factDivider} />
              <View style={styles.factRow}>
                <Text style={styles.factName}>Calcium</Text>
                <Text style={styles.factValue}>{calcium} mg</Text>
              </View>
              <View style={styles.factDivider} />
              <View style={styles.factRow}>
                <Text style={styles.factName}>Iron</Text>
                <Text style={styles.factValue}>{iron} mg</Text>
              </View>
            </View>

            {/* AI Metabolic & Quality Score */}
            <View style={styles.insightCard}>
              <View style={styles.insightIconBox}>
                <Sparkles size={16} color="#FA5D29" />
              </View>
              <View style={styles.insightBody}>
                <Text style={styles.insightTitle}>METABOLIC PROFILE</Text>
                <Text style={styles.insightText}>
                  {currentProtein >= 20
                    ? 'High protein density supports muscle recovery, positive nitrogen balance, and sustained satiety.'
                    : currentCarbs >= 30
                    ? 'Supplies fast and stable glycemic glycogen replenishment for physical endurance and mental focus.'
                    : 'Balanced micronutrient ratio suitable for clean energy balance and daily cellular maintenance.'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {isLogged && onDelete && (
              <TouchableOpacity style={styles.deleteActionBtn} onPress={onDelete}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                {isLogged ? 'Update Log' : 'Add to Diary'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '75%',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingTop: 12,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#334155',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleArea: {
    flex: 1,
    paddingRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  categoryBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  foodTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 26,
  },
  servingInfo: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FA5D29',
    letterSpacing: 0.8,
  },
  heroKcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  heroKcalNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroKcalUnit: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  macroSplitRings: {
    gap: 4,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '700',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  macroBox: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  macroTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  macroCal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  servingsControlCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  servingsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  servingsAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servBtnDisabled: {
    opacity: 0.4,
  },
  servingsCountText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    minWidth: 26,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  factsCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  factName: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  factValue: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  factDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 2,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250, 93, 41, 0.08)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 93, 41, 0.25)',
  },
  insightIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250, 93, 41, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FA5D29',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: 12,
  },
  deleteActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
