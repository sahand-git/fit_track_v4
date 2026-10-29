import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Pill,
  Plus,
  BookmarkCheck,
  RotateCcw,
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
  LoggedMeal,
  UserProfile,
} from '../types';
import { AppText as Text } from '../components/AppText';
import { DirectionalIcon } from '../components/DirectionalIcon';
import { ReminderSettingsModal } from '../components/ReminderSettingsModal';
import { RDAAnalysisCard } from '../components/RDAAnalysisCard';
import { NutrientDetailModal } from '../components/NutrientDetailModal';
import { SupplementTimeSection } from '../components/supplements/SupplementTimeSection';
import { SupplementModal } from '../components/supplements/SupplementModal';
import { SupplementDeleteModal } from '../components/supplements/SupplementDeleteModal';
import { SupportedNutrientKey } from '../utils/nutrientTotals';
import { calculateTargets } from '../utils/calculator';
import { saveUserProfile } from '../storage/storage';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { formatDisplayDate, getTodayDateString } from '../utils/dateUtils';
import {
  COMMON_SUPPLEMENT_CATALOG,
  CatalogSupplementItem,
} from '../data/supplementCatalog';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { buildRoutineFromDay, mergeRoutineIntoDay } from '../utils/supplementRoutine';
import * as Haptics from 'expo-haptics';

interface SupplementsScreenProps {
  selectedDate: string;
  routine: SupplementRoutineItem[];
  dailySupplements?: LoggedDailySupplement[];
  checks?: SupplementCheck[];
  meals?: LoggedMeal[];
  profile?: UserProfile;
  onUpdateDailySupplements: (items: LoggedDailySupplement[]) => Promise<void>;
  onUpdateRoutine: (items: SupplementRoutineItem[]) => Promise<void>;
  onToggleSupplement: (id: string, taken: boolean) => Promise<void>;
  onUpdateProfile?: (profile: UserProfile) => Promise<void>;
  onBack?: () => void;
}

const timeOptions: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];

type SaveTarget = 'day' | 'routine' | 'both';

export function SupplementsScreen({
  selectedDate,
  routine,
  dailySupplements,
  checks = [],
  meals = [],
  profile,
  onUpdateDailySupplements,
  onUpdateRoutine,
  onToggleSupplement,
  onUpdateProfile,
  onBack,
}: SupplementsScreenProps) {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (value: string) => translate(language, value);

  const isFuture = selectedDate > getTodayDateString();
  const [selectedNutrientForDetail, setSelectedNutrientForDetail] = useState<SupportedNutrientKey | string | null>(null);

  const handleSaveNutrientGoal = async (nutrientKey: SupportedNutrientKey, newTarget: number) => {
    if (!profile) return;
    const updatedGoals = { ...(profile.customNutrientGoals || {}), [nutrientKey]: newTarget };
    const updated: UserProfile = {
      ...profile,
      customNutrientGoals: updatedGoals,
    };
    if (nutrientKey === 'calories') updated.targetCalories = newTarget;
    if (nutrientKey === 'protein') updated.targetProtein = newTarget;
    if (nutrientKey === 'carbs') updated.targetCarbs = newTarget;
    if (nutrientKey === 'fat') updated.targetFat = newTarget;

    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else {
      await saveUserProfile(updated);
    }
  };

  const handleResetNutrientGoal = async (nutrientKey: SupportedNutrientKey) => {
    if (!profile) return;
    const updatedGoals = { ...(profile.customNutrientGoals || {}) };
    delete updatedGoals[nutrientKey];
    const updated: UserProfile = {
      ...profile,
      customNutrientGoals: updatedGoals,
    };
    if (nutrientKey === 'calories' || nutrientKey === 'protein' || nutrientKey === 'carbs' || nutrientKey === 'fat') {
      const defaultTargets = calculateTargets(
        profile.gender,
        profile.weightKg,
        profile.heightCm,
        profile.age,
        profile.activityLevel,
        profile.goal
      );
      if (nutrientKey === 'calories') updated.targetCalories = defaultTargets.targetCalories;
      if (nutrientKey === 'protein') updated.targetProtein = defaultTargets.targetProtein;
      if (nutrientKey === 'carbs') updated.targetCarbs = defaultTargets.targetCarbs;
      if (nutrientKey === 'fat') updated.targetFat = defaultTargets.targetFat;
    }

    if (onUpdateProfile) {
      await onUpdateProfile(updated);
    } else {
      await saveUserProfile(updated);
    }
  };

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
    setFormAmount(catItem.defaultAmount ? String(catItem.defaultAmount) : '');
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

  const bottomPadding = Math.max(120, insets.bottom + 90);

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
            <DirectionalIcon name="ArrowLeft" size={20} color={theme.colors.textPrimary} />
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
            accessibilityLabel={t('Load routine')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCcw size={14} color={theme.colors.primary} />
            <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Load routine')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionStripBtn}
            onPress={handleSaveDayAsRoutine}
            accessibilityRole="button"
            accessibilityLabel={t('Save day as routine')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BookmarkCheck size={14} color={theme.colors.secondary} />
            <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Save day as routine')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionStripBtn, styles.actionStripBtnPrimary]}
            onPress={() => openAddModal()}
            accessibilityRole="button"
            accessibilityLabel={t('Add supplement')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                  accessibilityRole="button"
                  accessibilityLabel={t('Load routine')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <RotateCcw size={15} color={theme.colors.primary} />
                  <Text style={styles.actionStripBtnText} numberOfLines={2}>{t('Load routine')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionStripBtn, styles.actionStripBtnPrimary, { paddingVertical: 10, paddingHorizontal: 16 }]}
                onPress={() => openAddModal()}
                accessibilityRole="button"
                accessibilityLabel={t('Browse catalog')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          return (
            <SupplementTimeSection
              key={slot}
              slot={slot}
              slotItems={slotItems}
              isFuture={isFuture}
              onOpenAddModal={openAddModal}
              onToggleItem={onToggleSupplement}
              onAdjustQuantity={handleAdjustQuantity}
              onOpenEditModal={openEditModal}
              onDeleteItem={handleDeleteItem}
              t={t}
            />
          );
        })
      )}

      {/* Micronutrients & RDA Analysis */}
      <RDAAnalysisCard
        meals={meals}
        supplements={activeItems}
        onSelectNutrient={(key) => setSelectedNutrientForDetail(key)}
      />

      {/* Educational Disclaimer */}
      <View style={styles.notice}>
        <AlertCircle size={15} color={theme.colors.secondary} style={{ marginTop: 1 }} />
        <Text style={styles.noticeText}>
          {t('Tracking only — FitTrack tracks your routine and does not recommend supplements or doses.')}
        </Text>
      </View>
    </ScrollView>

      {/* Add / Edit Supplement Modal */}
      <SupplementModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingItem={editingItem}
        catalogSearch={catalogSearch}
        setCatalogSearch={setCatalogSearch}
        selectedCatalogCategory={selectedCatalogCategory}
        setSelectedCatalogCategory={setSelectedCatalogCategory}
        filteredCatalog={filteredCatalog}
        onSelectCatalogItem={handleSelectCatalogItem}
        formName={formName}
        setFormName={setFormName}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formAmount={formAmount}
        setFormAmount={setFormAmount}
        formUnit={formUnit}
        setFormUnit={setFormUnit}
        formNote={formNote}
        setFormNote={setFormNote}
        formTime={formTime}
        setFormTime={setFormTime}
        formSaveTarget={formSaveTarget}
        setFormSaveTarget={setFormSaveTarget}
        isSaving={isSavingSupplement}
        onSave={handleSaveModal}
        bottomInset={insets.bottom}
        language={language}
        t={t}
      />

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
      <SupplementDeleteModal
        item={itemToDelete}
        isInRoutine={isItemInRoutine(itemToDelete)}
        onDeleteDayOnly={handleConfirmDeleteDayOnly}
        onDeleteRoutineToo={handleConfirmDeleteRoutineToo}
        onCancel={() => setItemToDelete(null)}
        language={language}
        t={t}
      />

      <ReminderSettingsModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        routine={routine}
      />

      <NutrientDetailModal
        visible={!!selectedNutrientForDetail}
        initialNutrientKey={selectedNutrientForDetail || 'vitaminC'}
        meals={meals}
        supplements={activeItems}
        profile={profile}
        onClose={() => setSelectedNutrientForDetail(null)}
        onSaveGoal={handleSaveNutrientGoal}
        onResetGoal={handleResetNutrientGoal}
      />
    </View>
  );
}

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
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
    shadowColor: theme.colors.shadow,
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
    color: theme.colors.textSecondary,
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
    fontSize: 12,
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

  // Modal styles
});
