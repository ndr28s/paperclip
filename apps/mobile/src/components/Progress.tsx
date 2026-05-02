import React from 'react';
import { View } from 'react-native';
import { T } from '../tokens';

interface ProgressProps {
  value: number;
  color?: string;
  height?: number;
  bg?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  color = T.accent,
  height = 4,
  bg = T.bg3,
}) => {
  const pct = Math.min(1, Math.max(0, value)) * 100;
  return (
    <View style={{ width: '100%', height, backgroundColor: bg, borderRadius: 999, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
};
