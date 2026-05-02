import React from 'react';
import { TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import { T } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.bg2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border1,
  },
});
