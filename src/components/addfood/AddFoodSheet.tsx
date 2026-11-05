import React from 'react';
import { Modal } from 'react-native';
import { AddFoodScreen } from '../../screens/AddFoodScreen';
import { LoggedMeal, MealType } from '../../types';
import { shouldResetFoodSelection, resolveSelectedVariantId } from './addFoodSelectionGuard';

export type TabMode = 'search' | 'photo' | 'describe';

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
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <AddFoodScreen
        date={date}
        mealType={mealType}
        initialTab={initialTab}
        initialScanBarcode={initialScanBarcode}
        onClose={onClose}
        onAddMeal={onAddMeal}
        onCopyYesterdayMeals={onCopyYesterdayMeals}
      />
    </Modal>
  );
};

export { shouldResetFoodSelection, resolveSelectedVariantId };
