import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { getFoodEmoji } from '../utils/foodCategories';

export interface FoodThumbnailProps {
  name: string;
  category?: string;
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
}

/**
 * Editorial Ledger Food Thumbnail
 *
 * Renders an offline-first food illustration badge with matching emoji or
 * cached/remote image. If an image fails to load or is offline, it gracefully
 * falls back to the local vector/emoji representation.
 *
 * Attribution note: Visual emoji mappings align with standard Unicode / Twemoji
 * categorization (Twemoji graphics by Twitter/X, CC-BY 4.0).
 */
export const FoodThumbnail: React.FC<FoodThumbnailProps> = ({
  name,
  category,
  imageUrl,
  size = 'small',
  style,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const emoji = getFoodEmoji(name, category);
  const showImage = Boolean(imageUrl && !imageFailed && imageUrl.startsWith('http'));

  const sizeDimensions = {
    small: { width: 36, height: 36, borderRadius: 10, fontSize: 18 },
    medium: { width: 44, height: 44, borderRadius: 12, fontSize: 22 },
    large: { width: 64, height: 64, borderRadius: 16, fontSize: 32 },
  }[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeDimensions.width,
          height: sizeDimensions.height,
          borderRadius: sizeDimensions.borderRadius,
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: sizeDimensions.width,
              height: sizeDimensions.height,
              borderRadius: sizeDimensions.borderRadius,
            },
          ]}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          style={[
            styles.emoji,
            { fontSize: sizeDimensions.fontSize, lineHeight: sizeDimensions.fontSize + 4 },
          ]}
        >
          {emoji}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: '#E5E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  emoji: {
    textAlign: 'center',
  },
});
