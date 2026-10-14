import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Pill,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  BookmarkCheck,
  RotateCcw,
  Search,
  X,
  Edit3,
  Calendar,
  AlertCircle,
  Bell,
} from 'lucide-react-native';
import {
  SupplementCheck,
  SupplementRoutineItem,
  SupplementTime,
  SupplementCategory,
  LoggedDailySupplement,
} from '../types';
import { AppText as Text } from '../components/AppText';
import { AnimatedCheckbox } from '../components/AnimatedCheckbox';
import { ReminderSettingsModal } from '../components/ReminderSettingsModal';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import {
  COMMON_SUPPLEMENT_CATALOG,
  COMMON_UNITS,
  CatalogSupplementItem,
} from '../data/supplementCatalog';
import { theme } from '../theme';
import { buildRoutineFromDay, mergeRoutineIntoDay } from '../utils/supplementRoutine';
import Animated from 'react-native-reanimated';
import {
  getListLayoutTransition,
  getItemEnterAnimation,
  getItemExitAnimation,
} from '../utils/reanimatedMotion';
import * as Haptics from 'expo-haptics';

interface SupplementsScreenProps {
  selectedDate: string;
  routine: SupplementRoutineItem[];
  dailySupplements?: LoggedDailySupplement[];
  checks?: SupplementCheck[];
  onUpdateDailySupplements: (items: LoggedDailySupplement[]) => Promise<void>;
  onUpdateRoutine: (items: SupplementRoutineItem[]) => Promise<void>;
  onToggleSupplement: (id: string, taken: boolean) => Promise<void>;
  onBack?: () => void;
}

const timeOptions: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];
const timeLabels: Record<SupplementTime, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  bedtime: 'Bedtime',
};

const categoryLabels: Record<SupplementCategory, string> = {
  vitamin: 'Vitamin',
  mineral: 'Mineral',
  supplement: 'Supplement',
  other: 'Other',
};

type SaveTarget = 'day' | 'routine' | 'both';

export function SupplementsScreen({
  selectedDate,
  routine,
  dailySupplements,
  checks = [],
  onUpdateDailySupplements,
  onUpdateRoutine,
  onToggleSupplement,
  onBack,
}: SupplementsScreenProps) {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = (value: string) => translate(language, value);

  const isFuture = selectedDate > getTodayDateString();

  // Resolved list of items for the selected day:
  // If the day already has specific daily items, use them.
  // Resolved list of items for the selected day:
  // If the day already has specific daily items (even empty []), use them.
  // Otherwise, if dailySupplements is undefined and routine has items, seed the view from routine.
  const activeItems = useMemo<LoggedDailySupplement[]>(() => {
    if (dailySupplements !== undefined) {
      return dailySupplements;
    }
    if (routine && routine.length > 0) {
      const takenSet = new Set((checks || []).filter((c) => c.taken).map((c) => c.itemId));
      return routine.map((r) => ({
        id: r.id,
        routineItemId: r.id,
        name: r.name,
        category: r.category || 'supplement',
        amount: r.amount,
        unit: r.unit,
        dose: r.dose,
        note: r.note,
        time: r.time,
        taken: takenSet.has(r.id),
      }));
    }
    return [];
  }, [dailySupplements, routine, checks]);

  // Daily Progress calculations
  const totalCount = activeItems.length;
  const takenCount = activeItems.filter((i) => i.taken).length;
  const remainingCount = Math.max(0, totalCount - takenCount);
  const completionPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isSavingSupplement, setIsSavingSupplement] = useState(false);
  const [editingItem, setEditingItem] = useState<LoggedDailySupplement | null>(null);

  // Delete Confirmation Modal state
  const [itemToDelete, setItemToDelete] = useState<LoggedDailySupplement | null>(null);

  // In-app feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reminders Modal state
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  // Handle Android hardware back press for sub-modals
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (itemToDelete) {
        setItemToDelete(null);
        return true;
      }
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      if (reminderModalVisible) {
        setReminderModalVisible(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [itemToDelete, modalVisible, reminderModalVisible]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<SupplementCategory>('vitamin');
  const [formAmount, setFormAmount] = useState('');
  const [formUnit, setFormUnit] = useState('tablet');
  const [formNote, setFormNote] = useState('');
  const [formTime, setFormTime] = useState<SupplementTime>('morning');
  const [formSaveTarget, setFormSaveTarget] = useState<SaveTarget>('both');

  // Catalog search & filter in modal
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<
    'all' | SupplementCategory
  >('all');

  const filteredCatalog = useMemo(() => {
    let list = COMMON_SUPPLEMENT_CATALOG;
    if (selectedCatalogCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCatalogCategory);
    }
    const q = catalogSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }
    return list;
  }, [catalogSearch, selectedCatalogCategory]);

  const openAddModal = (presetTime?: SupplementTime) => {
    if (isFuture) return;
    setEditingItem(null);
    setFormName('');
    setFormCategory('vitamin');
    setFormAmount('');
    setFormUnit('tablet');
    setFormNote('');
    setFormTime(presetTime || 'morning');
    setFormSaveTarget('both');
    setCatalogSearch('');
    setSelectedCatalogCategory('all');
    setModalVisible(true);
  };

  const openEditModal = (item: LoggedDailySupplement) => {
    if (isFuture) return;
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || 'supplement');
    setFormAmount(item.amount ? String(item.amount) : '');
    setFormUnit(item.unit || 'tablet');
    setFormNote(item.note || '');
    setFormTime(item.time);
    setFormSaveTarget('day');
    setCatalogSearch('');
    setSelectedCatalogCategory('all');
    setModalVisible(true);
  };

  const handleSelectCatalogItem = (catItem: CatalogSupplementItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormName(catItem.name);
    setFormCategory(catItem.category);
    setFormUnit(catItem.suggestedUnit);
    // Intentionally keep amount empty so user enters from product label
    setFormAmount('');
  };

  const handleSaveModal = async () => {
    const cleanName = formName.trim();
    if (!cleanName || isSavingSupplement) return;
    setIsSavingSupplement(true);

    const numAmount = parseFloat(formAmount);
    const validAmount = !isNaN(numAmount) && numAmount > 0 ? numAmount : undefined;
    const cleanUnit = formUnit.trim() || 'tablet';
    const cleanNote = formNote.trim() || undefined;
    const computedDose =
      validAmount !== undefined ? `${validAmount} ${cleanUnit}` : undefined;

    try {
    if (editingItem) {
      // Editing existing item
      const updatedDailyList = activeItems.map((item) => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: cleanName,
            category: formCategory,
            amount: validAmount,
            unit: cleanUnit,
            dose: computedDose || item.dose,
            note: cleanNote,
            time: formTime,
          };
        }
        return item;
      });
      await onUpdateDailySupplements(updatedDailyList);

      if (formSaveTarget === 'both' || formSaveTarget === 'routine') {
        const matchingRoutineIdx = routine.findIndex(
          (r) =>
            r.id === editingItem.routineItemId ||
            r.id === editingItem.id ||
            r.name.toLowerCase() === editingItem.name.toLowerCase()
        );
        if (matchingRoutineIdx >= 0) {
          const nextRoutine = [...routine];
          nextRoutine[matchingRoutineIdx] = {
            ...nextRoutine[matchingRoutineIdx],
            name: cleanName,
            category: formCategory,
            amount: validAmount,
            unit: cleanUnit,
            dose: computedDose || nextRoutine[matchingRoutineIdx].dose,
            note: cleanNote,
            time: formTime,
          };
          await onUpdateRoutine(nextRoutine);
        }
      }
    } else {
      // Adding new item
      const newId = `supp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newDailyItem: LoggedDailySupplement = {
        id: newId,
        routineItemId: formSaveTarget !== 'day' ? newId : undefined,
        name: cleanName,
        category: formCategory,
        amount: validAmount,
        unit: cleanUnit,
        dose: computedDose,
        note: cleanNote,
        time: formTime,
        taken: false,
      };

      if (formSaveTarget === 'routine' || formSaveTarget === 'both') {
        const newRoutineItem: SupplementRoutineItem = {
          id: newId,
          name: cleanName,
          category: formCategory,
          amount: validAmount,
          unit: cleanUnit,
          dose: computedDose,
          note: cleanNote,
          time: formTime,
        };
        const exists = routine.some(
          (r) => r.name.toLowerCase() === cleanName.toLowerCase() && r.time === formTime
        );
        if (!exists) {
          await onUpdateRoutine([...routine, newRoutineItem]);
        }
      }

      // Persist the routine first for combined saves. If writing the daily list then fails,
      // retrying will detect the existing routine item and won't create a duplicate.
      const existsInDay = activeItems.some(
        (item) => item.name.trim().toLowerCase() === cleanName.toLowerCase() && item.time === formTime
      );
      if (!existsInDay) await onUpdateDailySupplements([...activeItems, newDailyItem]);
    }

    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      console.error('Failed to save supplement:', err);
      Alert.alert(t('Save Error'), t('Could not save supplement. Please try again.'));
    } finally {
      setIsSavingSupplement(false);
    }
  };

  const handleAdjustQuantity = async (item: LoggedDailySupplement, delta: number) => {
    if (isFuture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const unitLower = (item.unit || 'tablet').toLowerCase();
    let step = 1;
    if (unitLower === 'mg') step = 50;
    else if (unitLower === 'iu') step = 500;
    else if (unitLower === 'mcg') step = 25;
    else if (unitLower === 'ml') step = 5;

    const currentAmt = item.amount ?? step;
    const nextAmt = Math.max(step, currentAmt + delta * step);
    const unit = item.unit || 'tablet';

    const updated = activeItems.map((it) => {
      if (it.id === item.id) {
        return {
          ...it,
          amount: nextAmt,
          dose: `${nextAmt} ${unit}`,
        };
      }
      return it;
    });
    await onUpdateDailySupplements(updated);
  };

  const isItemInRoutine = (item: LoggedDailySupplement | null) => {
    if (!item) return false;
    return routine.some(
      (r) =>
        r.id === item.routineItemId ||
        r.id === item.id ||
        (r.name.trim().toLowerCase() === item.name.trim().toLowerCase() && r.time === item.time)
    );
  };

  const handleDeleteItem = (item: LoggedDailySupplement) => {
    if (isFuture) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setItemToDelete(item);
  };

  const handleConfirmDeleteDayOnly = async () => {
    if (!itemToDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const target = itemToDelete;
    setItemToDelete(null);

    const updated = activeItems.filter((i) => i.id !== target.id);
    await onUpdateDailySupplements(updated);
    showToast(t('Supplement removed from today.'));
  };

  const handleConfirmDeleteRoutineToo = async () => {
    if (!itemToDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const target = itemToDelete;
    setItemToDelete(null);

    const updatedDaily = activeItems.filter((i) => i.id !== target.id);
    await onUpdateDailySupplements(updatedDaily);

    const updatedRoutine = routine.filter(
      (r) =>
        r.id !== target.routineItemId &&
        r.id !== target.id &&
        !(r.name.trim().toLowerCase() === target.name.trim().toLowerCase() && r.time === target.time)
    );
    await onUpdateRoutine(updatedRoutine);
    showToast(t('Supplement removed from routine and today.'));
  };

  const handleLoadRoutine = async () => {
    if (isFuture) return;
    if (routine.length === 0) {
      showToast(t('Your repeating routine is currently empty.'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const updated = mergeRoutineIntoDay(activeItems, routine, (item) =>
      `supp_${Date.now()}_${item.id}_${Math.random().toString(36).slice(2, 7)}`
    );

    if (updated.length === activeItems.length) {
      // If dailySupplements was not yet saved explicitly, save activeItems now
      if (dailySupplements === undefined && activeItems.length > 0) {
        try {
          await onUpdateDailySupplements(activeItems);
          showToast(t('Routine loaded into today.'));
        } catch (err) {
          console.error('Failed to load supplement routine:', err);
          showToast(t('Could not update supplements. Please try again.'));
        }
      } else {
        showToast(t('All routine items are already present.'));
      }
      return;
    }

    try {
      await onUpdateDailySupplements(updated);
      showToast(t('Routine loaded into today.'));
    } catch (err) {
      console.error('Failed to load supplement routine:', err);
      showToast(t('Could not update supplements. Please try again.'));
    }
  };

  const handleSaveDayAsRoutine = async () => {
    if (activeItems.length === 0) {
      showToast(t('No supplements on this day to save as routine.'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const newRoutine = buildRoutineFromDay(activeItems);

    try {
      await onUpdateRoutine(newRoutine);
      showToast(t('Current day saved as repeating routine.'));
    } catch (err) {
      console.error('Error saving routine:', err);
      showToast(t('Failed to save routine. Please try again.'));
    }
  };

  const bottomPadding = Math.max(112, insets.bottom + 76);

  const getTimeIcon = (slot: SupplementTime) => {
    switch (slot) {
      case 'morning':
        return <Sunrise size={18} color={theme.colors.accent} />;
      case 'afternoon':
        return <Sun size={18} color="#D97706" />;
      case 'evening':
        return <Sunset size={18} color="#C2410C" />;
      case 'bedtime':
        return <Moon size={18} color="#4338CA" />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scroll, { direction: language === 'en' ? 'ltr' : 'rtl' }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            accessibilityLabel={t('Back')}
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.iconBox}>
          <Pill size={19} color={theme.colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('Vitamins & Supplements')}</Text>
          <Text style={styles.subtitle}>{formatDisplayDate(selectedDate, language)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setReminderModalVisible(true);
          }}
          style={styles.reminderHeaderBtn}
          accessibilityLabel={t('Reminders')}
          accessibilityRole="button"
        >
          <Bell size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Future Date Read-Only Banner */}
      {isFuture && (
        <View style={styles.futureBanner}>
          <Calendar size={16} color={theme.colors.secondary} />
          <Text style={styles.futureBannerText}>
            {t('Future date — tracking is unavailable.')}
          </Text>
        </View>
      )}

      {/* Progress Today Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>{t('Progress today')}</Text>
          <Text style={styles.progressPercent}>{completionPercent}%</Text>
        </View>

        {/* Horizontal Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
        </View>

        {/* Neutral metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{takenCount}</Text>
            <Text style={styles.metricLabel}>{t('taken')}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{totalCount}</Text>
            <Text style={styles.metricLabel}>{t('scheduled')}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{remainingCount}</Text>
            <Text style={styles.metricLabel}>{t('remaining')}</Text>
          </View>
        </View>
      </View>

      {/* Routine Quick Actions Strip */}
      {!isFuture && (
        <View style={styles.actionStrip}>
          <TouchableOpacity
            style={styles.actionStripBtn}
            onPress={handleLoadRoutine}
            accessibilityRole="button"
          >
            <RotateCcw size={14} color={theme.colors.primary} />
            <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Load routine')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionStripBtn}
            onPress={handleSaveDayAsRoutine}
            accessibilityRole="button"
          >
            <BookmarkCheck size={14} color={theme.colors.secondary} />
            <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Save day as routine')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionStripBtn, styles.actionStripBtnPrimary]}
            onPress={() => openAddModal()}
            accessibilityRole="button"
          >
            <Plus size={15} color={theme.colors.textInverted} strokeWidth={2.5} />
            <Text style={styles.actionStripBtnPrimaryText} numberOfLines={2}>{t('Add supplement')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4 Time Slots Sections */}
      {totalCount === 0 ? (
        <View style={styles.emptyCard}>
          <Pill size={28} color={theme.colors.secondary} />
          <Text style={styles.emptyTitle}>{t('No supplements on this day\'s checklist yet.')}</Text>
          <Text style={styles.emptySubtitle}>
            {routine.length > 0
              ? t('Tap "Load routine" above to load your saved checklist, or browse the catalog to add items.')
              : t('No supplements added yet. Tap + to add items you take.')}
          </Text>
          {!isFuture && (
            <View style={styles.emptyActionsRow}>
              {routine.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionStripBtn, { paddingVertical: 10, paddingHorizontal: 14 }]}
                  onPress={handleLoadRoutine}
                >
                  <RotateCcw size={15} color={theme.colors.primary} />
                  <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Load routine')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionStripBtn, styles.actionStripBtnPrimary, { paddingVertical: 10, paddingHorizontal: 16 }]}
                onPress={() => openAddModal()}
              >
                <Plus size={16} color={theme.colors.textInverted} />
                <Text style={styles.actionStripBtnPrimaryText} numberOfLines={2}>{t('Browse catalog')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        timeOptions.map((slot) => {
          const slotItems = activeItems.filter((item) => item.time === slot);
          const slotTakenCount = slotItems.filter((i) => i.taken).length;

          return (
            <View key={slot} style={styles.slotCard}>
              {/* Slot Header */}
              <View style={styles.slotHeader}>
                <View style={styles.slotHeaderLeft}>
                  {getTimeIcon(slot)}
                  <Text style={styles.slotTitle}>{t(timeLabels[slot])}</Text>
                  {slotItems.length > 0 && (
                    <Text style={styles.slotCountBadge}>
                      {slotTakenCount}/{slotItems.length}
                    </Text>
                  )}
                </View>

                {!isFuture && (
                  <TouchableOpacity
                    onPress={() => openAddModal(slot)}
                    style={styles.slotQuickAdd}
                    accessibilityLabel={`${t('Add supplement')} · ${t(timeLabels[slot])}`}
                    accessibilityRole="button"
                  >
                    <Plus size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Slot Items */}
              {slotItems.length === 0 ? (
                <View style={styles.slotEmptyRow}>
                  <Text style={styles.slotEmptyText}>
                    {t('No supplements scheduled for this time.')}
                  </Text>
                </View>
              ) : (
                slotItems.map((item, idx) => {
                  const hasNumericAmount =
                    item.amount !== undefined && item.amount > 0 && Boolean(item.unit);
                  const isLast = idx === slotItems.length - 1;

                  return (
                    <Animated.View
                      key={item.id}
                      entering={getItemEnterAnimation()}
                      exiting={getItemExitAnimation()}
                      layout={getListLayoutTransition()}
                      style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                    >
                      {/* Checkbox */}
                      <TouchableOpacity
                        onPress={() => onToggleSupplement(item.id, !item.taken)}
                        disabled={isFuture}
                        style={[styles.checkbox, isFuture && styles.disabled]}
                        accessibilityLabel={t(item.taken ? 'Taken' : 'Mark as taken')}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.taken, disabled: isFuture }}
                      >
                        <AnimatedCheckbox checked={item.taken} size={22} />
                      </TouchableOpacity>

                      {/* Item Content */}
                      <View style={styles.itemContent}>
                        <View style={styles.itemTopRow}>
                          <Text
                            style={[
                              styles.itemName,
                              item.taken && styles.itemNameTaken,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.category && (
                            <View style={styles.categoryPill}>
                              <Text style={styles.categoryPillText}>
                                {t(categoryLabels[item.category] || item.category)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Amount & Unit Controls */}
                        <View style={styles.itemBottomRow}>
                          {hasNumericAmount ? (
                            <View style={styles.stepperWrap}>
                              {!isFuture && (
                                <TouchableOpacity
                                  onPress={() => handleAdjustQuantity(item, -1)}
                                  style={styles.stepperBtn}
                                  accessibilityLabel={t('Decrease quantity')}
                                  accessibilityRole="button"
                                >
                                  <Minus size={12} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                              )}
                              <Text style={styles.stepperValText}>
                                {item.amount} {t(item.unit || '')}
                              </Text>
                              {!isFuture && (
                                <TouchableOpacity
                                  onPress={() => handleAdjustQuantity(item, 1)}
                                  style={styles.stepperBtn}
                                  accessibilityLabel={t('Increase quantity')}
                                  accessibilityRole="button"
                                >
                                  <Plus size={12} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.legacyDoseText}>
                              {item.dose || ''}
                            </Text>
                          )}

                          {item.note ? (
                            <Text style={styles.itemNoteText}>• {item.note}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Row Actions */}
                      {!isFuture && (
                        <View style={styles.rowActions}>
                          <TouchableOpacity
                            onPress={() => openEditModal(item)}
                            style={styles.actionBtn}
                            accessibilityLabel={t('Edit')}
                            accessibilityRole="button"
                          >
                            <Edit3 size={15} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item)}
                            style={styles.actionBtn}
                            accessibilityLabel={t('Delete')}
                            accessibilityRole="button"
                          >
                            <Trash2 size={15} color={theme.colors.danger} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </Animated.View>
                  );
                })
              )}
            </View>
          );
        })
      )}

      {/* Educational Disclaimer */}
      <View style={styles.notice}>
        <AlertCircle size={15} color={theme.colors.secondary} style={{ marginTop: 1 }} />
        <Text style={styles.noticeText}>
          {t('Tracking only — FitTrack tracks your routine and does not recommend supplements or doses.')}
        </Text>
      </View>
    </ScrollView>

      {/* Add / Edit Supplement Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalCard, { paddingBottom: Math.max(theme.spacing.lg, insets.bottom + 12) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? t('Edit supplement') : t('Add supplement')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel={t('Close')}
                accessibilityRole="button"
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Catalog Search & Browse (Shown when adding a new item) */}
              {!editingItem && (
                <View style={styles.catalogBrowseSection}>
                  <Text style={styles.fieldSectionLabel}>{t('Browse catalog')}</Text>

                  {/* Search Bar */}
                  <View style={styles.catalogSearchBar}>
                    <Search size={16} color={theme.colors.textMuted} />
                    <TextInput
                      style={styles.catalogSearchInput}
                      placeholder={t('Search vitamins, minerals, supplements...')}
                      placeholderTextColor={theme.colors.textMuted}
                      value={catalogSearch}
                      onChangeText={setCatalogSearch}
                      returnKeyType="search"
                    />
                    {catalogSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setCatalogSearch('')}>
                        <X size={15} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Category Filter Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catalogChipsScroll}
                  >
                    {(['all', 'vitamin', 'mineral', 'supplement', 'other'] as const).map(
                      (catKey) => {
                        const isSelected = selectedCatalogCategory === catKey;
                        const labelText =
                          catKey === 'all'
                            ? t('All')
                            : catKey === 'vitamin'
                            ? t('Vitamins')
                            : catKey === 'mineral'
                            ? t('Minerals')
                            : catKey === 'supplement'
                            ? t('Supplements')
                            : t('Other');
                        return (
                          <TouchableOpacity
                            key={catKey}
                            style={[
                              styles.catalogChip,
                              isSelected && styles.catalogChipActive,
                            ]}
                            onPress={() => setSelectedCatalogCategory(catKey)}
                          >
                            <Text
                              style={[
                                styles.catalogChipText,
                                isSelected && styles.catalogChipTextActive,
                              ]}
                            >
                              {labelText}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </ScrollView>

                  {/* Catalog Suggestions Pills */}
                  <View style={styles.catalogSuggestionsGrid}>
                    {filteredCatalog.slice(0, 10).map((catItem) => (
                      <TouchableOpacity
                        key={catItem.id}
                        style={[
                          styles.catalogItemPill,
                          formName.toLowerCase() === catItem.name.toLowerCase() &&
                            styles.catalogItemPillSelected,
                        ]}
                        onPress={() => handleSelectCatalogItem(catItem)}
                      >
                        <Text
                          style={[
                            styles.catalogItemPillText,
                            formName.toLowerCase() === catItem.name.toLowerCase() &&
                              styles.catalogItemPillTextSelected,
                          ]}
                        >
                          {catItem.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Form Input Fields */}
              <View style={styles.formContainer}>
                {/* Supplement Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('Supplement name')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('Supplement name')}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Category Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('Category')}</Text>
                  <View style={styles.pillsRow}>
                    {(['vitamin', 'mineral', 'supplement', 'other'] as SupplementCategory[]).map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.optionChip,
                            formCategory === cat && styles.optionChipActive,
                          ]}
                          onPress={() => setFormCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              formCategory === cat && styles.optionChipTextActive,
                            ]}
                          >
                            {t(categoryLabels[cat])}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {/* Amount and Unit Row */}
                <View style={styles.amountUnitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('Amount')}</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formAmount}
                      onChangeText={setFormAmount}
                      keyboardType="numeric"
                      placeholder={t('e.g. 500')}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <Text style={styles.fieldHelper}>
                      {t('Enter amount printed on label')}
                    </Text>
                  </View>

                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.inputLabel}>{t('Unit')}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingTop: 2 }}
                    >
                      {COMMON_UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitChip,
                            formUnit === unit && styles.unitChipActive,
                          ]}
                          onPress={() => setFormUnit(unit)}
                        >
                          <Text
                            style={[
                              styles.unitChipText,
                              formUnit === unit && styles.unitChipTextActive,
                            ]}
                          >
                            {t(unit)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Optional Note */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('Note (optional)')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formNote}
                    onChangeText={setFormNote}
                    placeholder={t('e.g. with food')}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Time of Day */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('Time of day')}</Text>
                  <View style={styles.pillsRow}>
                    {timeOptions.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.optionChip,
                          formTime === slot && styles.optionChipActive,
                        ]}
                        onPress={() => setFormTime(slot)}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            formTime === slot && styles.optionChipTextActive,
                          ]}
                        >
                          {t(timeLabels[slot])}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Where to save */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('Where to save')}</Text>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity
                      style={[
                        styles.targetChoiceRow,
                        formSaveTarget === 'both' && styles.targetChoiceRowActive,
                      ]}
                      onPress={() => setFormSaveTarget('both')}
                    >
                      <View style={styles.radioCircle}>
                        {formSaveTarget === 'both' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.targetChoiceText}>
                        {t('Both this day and routine')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.targetChoiceRow,
                        formSaveTarget === 'day' && styles.targetChoiceRowActive,
                      ]}
                      onPress={() => setFormSaveTarget('day')}
                    >
                      <View style={styles.radioCircle}>
                        {formSaveTarget === 'day' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.targetChoiceText}>{t('This day only')}</Text>
                    </TouchableOpacity>

                    {!editingItem && (
                      <TouchableOpacity
                        style={[
                          styles.targetChoiceRow,
                          formSaveTarget === 'routine' && styles.targetChoiceRowActive,
                        ]}
                        onPress={() => setFormSaveTarget('routine')}
                      >
                        <View style={styles.radioCircle}>
                          {formSaveTarget === 'routine' && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.targetChoiceText}>
                          {t('Repeating routine only')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    (!formName.trim() || isSavingSupplement) && styles.modalSaveBtnDisabled,
                  ]}
                  onPress={handleSaveModal}
                  disabled={!formName.trim() || isSavingSupplement}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalSaveBtnText}>
                    {editingItem ? t('Update supplement') : t('Save Supplement')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

      {/* Floating in-app Toast Notification */}
      {toastMessage && (
        <View
          style={[
            styles.toastWrap,
            { bottom: Math.max(20, insets.bottom + 12) },
          ]}
        >
          <View style={styles.toastBox}>
            <CheckCircle2 size={16} color={theme.colors.primary} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Cross-platform Delete Confirmation Modal */}
      <Modal
        visible={Boolean(itemToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToDelete(null)}
      >
        <View style={[styles.deleteModalBackdrop, { direction: language === 'en' ? 'ltr' : 'rtl' }]}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalIconBox}>
              <Trash2 size={24} color={theme.colors.danger} />
            </View>

            <Text style={styles.deleteModalTitle}>{t('Delete supplement')}</Text>

            <Text style={styles.deleteModalMsg}>
              {t('Are you sure you want to delete this supplement?')}
              {itemToDelete ? `\n"${itemToDelete.name}"` : ''}
            </Text>

            <View style={styles.deleteModalBtnGroup}>
              {isItemInRoutine(itemToDelete) ? (
                <>
                  <TouchableOpacity
                    style={[styles.deleteModalBtn, styles.deleteModalBtnSecondary]}
                    onPress={handleConfirmDeleteDayOnly}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteModalBtnSecondaryText}>
                      {t('Remove from this day')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteModalBtn, styles.deleteModalBtnDanger]}
                    onPress={handleConfirmDeleteRoutineToo}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteModalBtnDangerText}>
                      {t('Remove from routine too')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.deleteModalBtn, styles.deleteModalBtnDanger]}
                  onPress={handleConfirmDeleteDayOnly}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteModalBtnDangerText}>
                    {t('Delete')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.deleteModalBtn, styles.deleteModalBtnCancel]}
                onPress={() => setItemToDelete(null)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.deleteModalBtnCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReminderSettingsModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        routine={routine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteModalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  deleteModalMsg: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  deleteModalBtnGroup: {
    width: '100%',
    gap: 10,
  },
  deleteModalBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalBtnSecondary: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteModalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  deleteModalBtnDanger: {
    backgroundColor: theme.colors.danger,
  },
  deleteModalBtnDangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  deleteModalBtnCancel: {
    backgroundColor: 'transparent',
  },
  deleteModalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  content: {
    padding: theme.spacing.md,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  backBtn: {
    padding: 6,
    marginRight: 2,
  },
  reminderHeaderBtn: {
    padding: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 23,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  futureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
  },
  futureBannerText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadow.subtle,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 4,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: theme.colors.border,
  },
  actionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  actionStripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    minHeight: 40,
    flexGrow: 1,
    flexShrink: 1,
    ...theme.shadow.subtle,
  },
  actionStripBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  actionStripBtnPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    flexGrow: 1.5,
  },
  actionStripBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textInverted,
    textAlign: 'center',
    flexShrink: 1,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  slotCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.subtle,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  slotCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  slotQuickAdd: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  slotEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    padding: 2,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemNameTaken: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  categoryPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 2,
    paddingHorizontal: 4,
    gap: 6,
  },
  stepperBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  legacyDoseText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  itemNoteText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 5,
  },
  notice: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.55,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.md,
    maxHeight: '90%',
    ...theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  catalogBrowseSection: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
    gap: 10,
  },
  fieldSectionLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  catalogSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  catalogChipsScroll: {
    gap: 6,
  },
  catalogChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  catalogChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  catalogChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  catalogChipTextActive: {
    color: theme.colors.primary,
  },
  catalogSuggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catalogItemPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catalogItemPillSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  catalogItemPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catalogItemPillTextSelected: {
    color: theme.colors.primary,
  },
  formContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  fieldHelper: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  amountUnitRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  unitChip: {
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  unitChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  unitChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  unitChipTextActive: {
    color: theme.colors.primary,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  optionChipTextActive: {
    color: theme.colors.primary,
  },
  targetChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  targetChoiceRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  targetChoiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  modalSaveBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveBtnText: {
    color: theme.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
});
