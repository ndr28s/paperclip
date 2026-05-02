import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../tokens';
import { Icon } from './Icon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right, showBack, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
      {showBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="back" size={22} color={T.fg1} />
        </TouchableOpacity>
      )}
      <View style={[styles.titleWrap, showBack && { paddingLeft: 8 }]}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: T.bg1,
    borderBottomWidth: 1,
    borderBottomColor: T.border1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: T.fg0,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subtitle: {
    color: T.fg2,
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: T.fg0,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionAction: {
    color: T.accent,
    fontSize: 13,
    fontWeight: '500',
  },
});
