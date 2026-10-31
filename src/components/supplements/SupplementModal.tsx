import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { X, Search } from 'lucide-react-native';
import {
  LoggedDailySupplement,
  SupplementCategory,
  SupplementTime,
  AppLanguage,
} from '../../types';
import { CatalogSupplementItem } from '../../data/supplementCatalog';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKeyboardVerticalOffset } from '../../utils/keyboardAvoidance';
import { categoryLabels, timeLabels } from './supplementTypes';

const COMMON_UNITS = ['mg', 'mcg', 'IU', 'g', 'ml', 'drops', 'capsules', 'tablets'];
const timeOptions: SupplementTime[] = ['morning', 'afternoon', 'evening', 'bedtime'];

export interface SupplementModalProps {
  visible: boolean;
  onClose: () => void;
  editingItem: LoggedDailySupplement | null;
  catalogSearch: string;
  setCatalogSearch: (val: string) => void;
  selectedCatalogCategory: 'all' | 'vitamin' | 'mineral' | 'supplement' | 'other';
  setSelectedCatalogCategory: (
    val: 'all' | 'vitamin' | 'mineral' | 'supplement' | 'other'
  ) => void;
  filteredCatalog: CatalogSupplementItem[];
  onSelectCatalogItem: (item: CatalogSupplementItem) => void;
  formName: string;
  setFormName: (val: string) => void;
  formCategory: SupplementCategory;
  setFormCategory: (val: SupplementCategory) => void;
  formAmount: string;
  setFormAmount: (val: string) => void;
  formUnit: string;
  setFormUnit: (val: string) => void;
  formNote: string;
  setFormNote: (val: string) => void;
  formTime: SupplementTime;
  setFormTime: (val: SupplementTime) => void;
  formSaveTarget: 'day' | 'routine' | 'both';
  setFormSaveTarget: (val: 'day' | 'routine' | 'both') => void;
  isSaving: boolean;
  onSave: () => void;
  bottomInset: number;
  language: AppLanguage;
  t: (key: string) => string;
}

export const SupplementModal: React.FC<SupplementModalProps> = ({
  visible,
  onClose,
  editingItem,
  catalogSearch,
  setCatalogSearch,
  selectedCatalogCategory,
  setSelectedCatalogCategory,
  filteredCatalog,
  onSelectCatalogItem,
  formName,
  setFormName,
  formCategory,
  setFormCategory,
  formAmount,
  setFormAmount,
  formUnit,
  setFormUnit,
  formNote,
  setFormNote,
  formTime,
  setFormTime,
  formSaveTarget,
  setFormSaveTarget,
  isSaving,
  onSave,
  bottomInset,
  language,
  t,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalBackdrop,
          { direction: language === 'en' ? 'ltr' : 'rtl' },
        ]}
      >
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={getKeyboardVerticalOffset(insets.top)}
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(theme.spacing.lg, bottomInset + 12) },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? t('Edit supplement') : t('Add supplement')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseBtn}
                accessibilityLabel={t('Close')}
                accessibilityRole="button"
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            >
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
                      <TouchableOpacity
                        onPress={() => setCatalogSearch('')}
                        accessibilityRole="button"
                        accessibilityLabel={t('Clear')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
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
                            accessibilityRole="button"
                            accessibilityLabel={labelText}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        onPress={() => onSelectCatalogItem(catItem)}
                        accessibilityRole="button"
                        accessibilityLabel={catItem.name}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text
                          style={[
                            styles.catalogItemPillText,
                            formName.toLowerCase() === catItem.name.toLowerCase() &&
                              styles.catalogItemPillTextSelected,
                          ]}
                        >
                          {catItem.icon ? `${catItem.icon} ` : ''}
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
                          accessibilityRole="button"
                          accessibilityLabel={t(categoryLabels[cat])}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                          accessibilityRole="button"
                          accessibilityLabel={t(unit)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        accessibilityRole="button"
                        accessibilityLabel={t(timeLabels[slot])}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                      accessibilityRole="button"
                      accessibilityLabel={t('Both this day and routine')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                      accessibilityRole="button"
                      accessibilityLabel={t('This day only')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        accessibilityRole="button"
                        accessibilityLabel={t('Repeating routine only')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                    (!formName.trim() || isSaving) && styles.modalSaveBtnDisabled,
                  ]}
                  onPress={onSave}
                  disabled={!formName.trim() || isSaving}
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingItem ? t('Update supplement') : t('Save Supplement')
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
    ...theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  catalogBrowseSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  catalogSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  catalogChipsScroll: {
    gap: 6,
    marginBottom: 10,
  },
  catalogChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catalogChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catalogChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  catalogChipTextActive: {
    color: theme.colors.textInverted,
  },
  catalogSuggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catalogItemPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catalogItemPillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catalogItemPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  catalogItemPillTextSelected: {
    color: theme.colors.textInverted,
    fontWeight: '600',
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fieldHelper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  optionChipTextActive: {
    color: theme.colors.textInverted,
  },
  amountUnitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  unitChipTextActive: {
    color: theme.colors.textInverted,
  },
  targetChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  targetChoiceRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  targetChoiceText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  modalSaveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.shadow.subtle,
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
