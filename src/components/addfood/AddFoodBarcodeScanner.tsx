import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { AlertTriangle } from 'lucide-react-native';
import { CameraView } from 'expo-camera';
import { theme } from '../../theme';

export interface AddFoodBarcodeScannerProps {
  isScanningBarcode: boolean;
  onBarcodeScanned: (data: string) => void;
  onCloseScanner: () => void;
  manualBarcode: string;
  onManualBarcodeChange: (text: string) => void;
  onPerformBarcodeLookup: (code: string) => void;
  barcodeLoading: boolean;
  barcodeError: string | null;
  onRequestFoodWithBarcode?: () => void;
  t: (key: string) => string;
}

export const AddFoodBarcodeScanner: React.FC<AddFoodBarcodeScannerProps> = ({
  isScanningBarcode,
  onBarcodeScanned,
  onCloseScanner,
  manualBarcode,
  onManualBarcodeChange,
  onPerformBarcodeLookup,
  barcodeLoading,
  barcodeError,
  onRequestFoodWithBarcode,
  t,
}) => {
  if (isScanningBarcode) {
    return (
      <View style={styles.cameraFrame}>
        {Platform.OS === 'web' ? (
          <View style={styles.cameraWebFallback}>
            <AlertTriangle size={28} color={theme.colors.accent} />
            <Text style={styles.fallbackTitle}>{t('Web Browser Camera')}</Text>
            <Text style={styles.fallbackDesc}>
              {t(
                'Live video barcode scanning requires native mobile camera hardware. Use manual barcode entry below to look up any product immediately.'
              )}
            </Text>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={onCloseScanner}
              accessibilityRole="button"
              accessibilityLabel={t('Enter digits')}
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
              if (data) {
                onBarcodeScanned(data);
              }
            }}
          >
            <View style={styles.reticleOverlay}>
              <View style={styles.reticle} />
              <Text style={styles.reticleText}>{t('Scan barcode')}</Text>
              <TouchableOpacity
                style={styles.cancelScanBtn}
                onPress={onCloseScanner}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Text style={styles.cancelScanText}>{t('Close')}</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        )}
      </View>
    );
  }

  return (
    <>
      <View style={styles.manualBarcodeRow}>
        <TextInput
          style={styles.manualBarcodeInput}
          placeholder={t('Enter Barcode (UPC / EAN)')}
          placeholderTextColor={theme.colors.textMuted}
          value={manualBarcode}
          onChangeText={onManualBarcodeChange}
          keyboardType="numeric"
          onSubmitEditing={() => onPerformBarcodeLookup(manualBarcode)}
        />
        <TouchableOpacity
          style={styles.manualBarcodeSubmitBtn}
          onPress={() => onPerformBarcodeLookup(manualBarcode)}
          disabled={barcodeLoading || !manualBarcode.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('Search')}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <AlertTriangle size={15} color={theme.colors.danger} />
            <Text style={styles.errorNoticeText}>{barcodeError}</Text>
          </View>
          {onRequestFoodWithBarcode ? (
            <TouchableOpacity
              style={styles.requestBarcodeBtn}
              onPress={onRequestFoodWithBarcode}
              accessibilityRole="button"
              accessibilityLabel={t('Request a Food')}
            >
              <Text style={styles.requestBarcodeBtnText}>{t('Request a Food')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  cameraFrame: {
    height: 300,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  cameraWebFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  fallbackDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  actionBtnPrimaryText: {
    color: theme.colors.textInverted,
    fontWeight: '700',
    fontSize: 14,
  },
  reticleOverlay: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 240,
    height: 140,
    borderWidth: 2,
    borderColor: theme.colors.white,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  reticleText: {
    color: theme.colors.textInverted,
    fontSize: 13,
    marginTop: 14,
    fontWeight: '600',
  },
  cancelScanBtn: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.backdrop,
    borderRadius: theme.radius.full,
  },
  cancelScanText: {
    color: theme.colors.textInverted,
    fontSize: 13,
    fontWeight: '600',
  },
  manualBarcodeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  manualBarcodeInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  manualBarcodeSubmitBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualBarcodeSubmitText: {
    color: theme.colors.textInverted,
    fontSize: 12,
    fontWeight: '700',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 10,
    borderRadius: theme.radius.sm,
    marginVertical: 6,
    justifyContent: 'space-between',
    gap: 8,
  },
  errorNoticeText: {
    fontSize: 12,
    color: theme.colors.danger,
    flex: 1,
  },
  requestBarcodeBtn: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  requestBarcodeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
