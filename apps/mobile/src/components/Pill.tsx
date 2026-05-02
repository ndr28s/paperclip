import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AgentStatus } from '../data';
import { T } from '../tokens';

const STATUS_STYLE: Record<AgentStatus, { bg: string; fg: string; label: string }> = {
  active:   { bg: T.okBg,   fg: T.ok,     label: 'ACTIVE' },
  thinking: { bg: T.accBg,  fg: T.accent, label: 'THINKING' },
  idle:     { bg: T.accBg,  fg: T.accent, label: 'IDLE' },
  paused:   { bg: T.pauseBg, fg: T.fg2,   label: 'PAUSED' },
  blocked:  { bg: T.warnBg, fg: T.warn,   label: 'BLOCKED' },
  error:    { bg: T.errBg,  fg: T.err,    label: 'ERROR' },
};

interface PillProps {
  status: AgentStatus;
  size?: 'sm' | 'lg';
  label?: string;
}

export const Pill: React.FC<PillProps> = ({ status, size = 'sm', label }) => {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.idle;
  const isLg = size === 'lg';
  return (
    <View style={[styles.pill, {
      backgroundColor: s.bg,
      paddingVertical: isLg ? 5 : 3,
      paddingHorizontal: isLg ? 11 : 8,
    }]}>
      <Text style={[styles.text, { color: s.fg, fontSize: isLg ? 12 : 11 }]}>
        {label ?? s.label}
      </Text>
    </View>
  );
};

const TYPE_BADGE: Record<string, { bg: string; fg: string }> = {
  Deploy: { bg: 'rgba(74,144,226,0.18)',  fg: '#7AB7E8' },
  Spend:  { bg: 'rgba(245,166,35,0.18)',  fg: '#F5A623' },
  Access: { bg: 'rgba(232,82,74,0.18)',   fg: '#E8524A' },
  Hire:   { bg: 'rgba(160,108,213,0.18)', fg: '#C078E0' },
};

interface TypeBadgeProps {
  type: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const s = TYPE_BADGE[type] ?? TYPE_BADGE.Deploy;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, paddingVertical: 3, paddingHorizontal: 8 }]}>
      <Text style={[styles.text, { color: s.fg, fontSize: 11 }]}>{type.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
    letterSpacing: 0.4,
    lineHeight: 14,
  },
});
