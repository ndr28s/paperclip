// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../tokens';

interface Props {
  version: string;
  notes?: string;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, notes, onInstall, onDismiss }: Props) {
  return (
    <View style={s.banner}>
      <View style={s.left}>
        <Text style={s.title}>업데이트 {version} 사용 가능</Text>
        {notes ? <Text style={s.notes}>{notes}</Text> : null}
      </View>
      <View style={s.btns}>
        <TouchableOpacity style={s.installBtn} onPress={onInstall}>
          <Text style={s.installText}>설치</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
          <Text style={s.dismissText}>나중에</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: T.bg2,
    borderBottomWidth: 1,
    borderBottomColor: T.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  left: { flex: 1, gap: 3 },
  title: { color: T.fg0, fontSize: 13, fontWeight: '600' },
  notes: { color: T.fg2, fontSize: 12 },
  btns: { flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  installBtn: {
    backgroundColor: T.accent,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  installText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dismissBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  dismissText: { color: T.fg3, fontSize: 12 },
});
