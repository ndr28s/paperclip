// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { T } from '../tokens';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { useCompany } from '../context/CompanyContext';
import { useSession } from '../context/SessionContext';
import { useCompanyData } from '../hooks/useApi';
import { useAppUpdate } from '../hooks/useAppUpdate';

interface RowProps {
  icon: string;
  label: string;
  sub?: string;
  err?: boolean;
  last?: boolean;
  onPress?: () => void;
}

const Row: React.FC<RowProps> = ({ icon, label, sub, err, last, onPress }) => (
  <TouchableOpacity activeOpacity={0.7} style={[styles.row, last && styles.rowLast]} onPress={onPress}>
    <View style={[styles.iconWrap, err && { backgroundColor: T.errBg }]}>
      <Icon name={icon} size={18} color={err ? T.err : T.fg1} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[styles.rowLabel, err && { color: T.err }]}>{label}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
    <Icon name="chev" size={18} color={T.fg3} />
  </TouchableOpacity>
);

interface GroupProps {
  title: string;
  items: RowProps[];
}

const Group: React.FC<GroupProps> = ({ title, items }) => (
  <>
    <Text style={styles.groupTitle}>{title.toUpperCase()}</Text>
    <View style={styles.groupBox}>
      {items.map((it, i) => (
        <Row key={i} {...it} last={i === items.length - 1} />
      ))}
    </View>
  </>
);

export const MoreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { company } = useCompany();
  const { user, logout } = useSession();
  const { data: agentsData } = useCompanyData<any[]>('/agents');

  const { updateAvailable, updateInfo, downloadAndInstall } = useAppUpdate();
  const agentCount = agentsData?.length ?? 0;
  const userName = user?.name ?? user?.email ?? 'User';
  const userInitials = userName.slice(0, 2).toUpperCase();
  const companyName = company?.name ?? 'Workspace';

  const versionSub = updateAvailable && updateInfo
    ? `v${updateInfo.version} available → tap to install`
    : 'v0.0.3';

  const SETTINGS_ITEMS: RowProps[] = [
    { icon: 'bell2', label: 'Notifications', sub: undefined, err: false },
    { icon: 'sun',   label: 'Appearance',    sub: undefined, err: false },
    {
      icon: 'sparkle',
      label: 'Version',
      sub: versionSub,
      err: false,
      onPress: updateAvailable ? () => downloadAndInstall() : undefined,
    },
    {
      icon: 'out',
      label: 'Sign out',
      sub: undefined,
      err: true,
      onPress: () => {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: () => logout() },
        ]);
      },
    },
  ];

  const MAIN_ITEMS: RowProps[] = [
    { icon: 'wave', label: 'Activity',      sub: 'Chronological feed',   onPress: () => navigation.navigate('Activity') },
    { icon: 'coin', label: 'Usage & costs', sub: 'Monthly spend',        onPress: () => navigation.navigate('Usage') },
    { icon: 'tree', label: 'Org chart',     sub: `${agentCount} agents`, onPress: () => navigation.navigate('OrgChart') },
    { icon: 'cal',  label: 'Meetings',      sub: 'Scheduled meetings',   onPress: () => navigation.navigate('Meetings') },
  ];

  return (
    <View style={styles.container}>
      <View style={{ height: 56 }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile card */}
        <View style={styles.profileWrap}>
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar agent={{ initials: userInitials, color: T.bg4 }} size={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileRole}>{companyName}</Text>
                {user?.email ? <Text style={styles.profilePlan}>{user.email}</Text> : null}
              </View>
              <Icon name="edit" size={18} color={T.fg2} />
            </View>
            <TouchableOpacity
              style={styles.switchWorkspaceBtn}
              onPress={() => navigation.navigate('WorkspacePicker')}
              activeOpacity={0.7}
            >
              <Icon name="folder" size={14} color={T.accent} />
              <Text style={styles.switchWorkspaceText}>워크스페이스 전환</Text>
              <Icon name="chev" size={14} color={T.accent} />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 24 }} />
        <Group title="Workspace" items={MAIN_ITEMS} />
        <View style={{ height: 20 }} />
        <Group title="Settings" items={SETTINGS_ITEMS} />
        <View style={{ height: 32 }} />

        <Text style={styles.version}>Paperclip 2.4.1 · build a3f819</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  profileWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  profileName: { color: T.fg0, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  profileRole: { color: T.fg2, fontSize: 13, marginTop: 1 },
  profilePlan: { color: T.fg3, fontSize: 12, marginTop: 2 },
  groupTitle: {
    color: T.fg3, fontSize: 11, fontWeight: '600', letterSpacing: 0.6,
    paddingHorizontal: 16, marginBottom: 8,
  },
  groupBox: {
    borderRadius: 14, marginHorizontal: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, height: 56,
    paddingHorizontal: 16, backgroundColor: T.bg2,
    borderBottomWidth: 1, borderBottomColor: T.border1,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: T.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { color: T.fg0, fontSize: 15, fontWeight: '500' },
  rowSub: { color: T.fg2, fontSize: 12, marginTop: 1 },
  switchWorkspaceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.border1,
  },
  switchWorkspaceText: {
    flex: 1, color: T.accent, fontSize: 13, fontWeight: '500',
  },
  version: {
    textAlign: 'center', color: T.fg3, fontSize: 11,
    fontFamily: 'monospace', paddingBottom: 24,
  },
});
