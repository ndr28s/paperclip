// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { T } from '../tokens';
import { Avatar } from '../components/Avatar';
import { TypeBadge } from '../components/Pill';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import type { RootStackParamList } from '../navigation';
import { useItemData } from '../hooks/useApi';
import { api } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalDetail'>;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const ApprovalDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const approvalId = route.params.approvalId;
  const { data: ap, loading } = useItemData<any>(`/approvals/${approvalId}`);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  if (!ap) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: T.fg3, fontSize: 14 }}>Approval not found</Text>
      </View>
    );
  }

  const agentName = ap.agentName ?? (ap.payload as any)?.agentName ?? ap.requestedByAgentId?.slice(0, 8) ?? 'Agent';
  const AGENT_COLORS_DETAIL = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
  const _agentColorId = ap.requestedByAgentId ?? ap.id ?? '';
  let _hash = 0;
  for (let i = 0; i < _agentColorId.length; i++) _hash = ((_hash << 5) - _hash) + _agentColorId.charCodeAt(i);
  const agentColorVal = AGENT_COLORS_DETAIL[Math.abs(_hash) % AGENT_COLORS_DETAIL.length];
  const agentRole = ap.agentRole ?? '';
  const agentObj = { initials: agentName.slice(0, 2).toUpperCase(), color: agentColorVal };

  const summary = ap.summary ?? (ap.payload as any)?.summary ?? (ap.payload as any)?.detail ?? (ap.payload as any)?.title ?? ap.type;
  const isUrgent = ap.urgent === true || (ap.payload as any)?.urgent === true;
  const apType = ap.type === 'hire_agent' ? 'hire' : ap.type;

  const rationale: string[] = ap.rationale ?? (ap.payload as any)?.rationale ?? [];
  const meta: [string, string][] = ap.meta ?? Object.entries(ap.payload ?? {})
    .filter(([k]) => !['summary','detail','title','urgent','rationale','agentName'].includes(k))
    .slice(0, 6)
    .map(([k, v]) => [k, String(v)]);
  const thread: any[] = ap.thread ?? [];

  async function handleApprove() {
    try {
      await api.post(`/approvals/${ap.id}/approve`, {});
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to approve');
    }
  }

  function handleReject() {
    Alert.alert(
      'Reject Approval',
      'Add a reason (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Approval"
        showBack
        onBack={() => navigation.goBack()}
        right={<TypeBadge type={apType} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.content}>
          {/* Agent header */}
          <View style={styles.agentRow}>
            <Avatar agent={agentObj} size={44} dot />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.agentName}>{agentName}</Text>
              {agentRole ? <Text style={styles.agentRole}>{agentRole}</Text> : null}
            </View>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Icon name="zap" size={12} color={T.err} />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <Text style={styles.sectionLabel}>SUMMARY</Text>
          <Text style={styles.summaryText}>{summary}</Text>

          {/* Rationale */}
          {rationale.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 18 }]}>RATIONALE</Text>
              <View style={{ gap: 8, marginBottom: 18 }}>
                {rationale.map((r: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.rationaleText}>{r}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Details grid */}
          {meta.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>DETAILS</Text>
              <View style={styles.metaGrid}>
                {meta.map(([k, v]: [string, string], i: number) => (
                  <View key={i} style={styles.metaCell}>
                    <Text style={styles.metaKey}>{k.toUpperCase()}</Text>
                    <Text style={[styles.metaValue, k === 'Budget' && { fontFamily: 'monospace' }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Created at */}
          {ap.createdAt && (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sectionLabel}>REQUESTED</Text>
              <Text style={{ color: T.fg1, fontSize: 14 }}>{timeAgo(ap.createdAt)}</Text>
            </View>
          )}

          {/* Thread preview */}
          {thread.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>RECENT THREAD</Text>
              <Card style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Avatar agent={agentObj} size={26} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.threadMeta}>
                      <Text style={{ color: agentColor, fontWeight: '600' }}>{agentName}</Text>
                      {thread[0].age && <Text style={{ color: T.fg2 }}> · {thread[0].age} ago</Text>}
                      {thread[0].createdAt && <Text style={{ color: T.fg2 }}> · {timeAgo(thread[0].createdAt)}</Text>}
                    </Text>
                    <Text style={styles.threadText}>{thread[0].text}</Text>
                  </View>
                </View>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.btnDiscuss} activeOpacity={0.7}>
          <Text style={styles.btnDiscussText}>Discuss</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnReject} activeOpacity={0.7} onPress={handleReject}>
          <Text style={styles.btnRejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnApprove} activeOpacity={0.7} onPress={handleApprove}>
          <Text style={styles.btnApproveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  content: { padding: 16 },
  agentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  agentName: { color: T.fg0, fontSize: 16, fontWeight: '600' },
  agentRole: { color: T.fg2, fontSize: 12, marginTop: 1 },
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.errBg, paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 999,
  },
  urgentText: { color: T.err, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  sectionLabel: { color: T.fg3, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  summaryText: { color: T.fg0, fontSize: 16, lineHeight: 24, marginBottom: 0 },
  bullet: { color: T.accent, fontSize: 14, lineHeight: 20, marginTop: 2 },
  rationaleText: { color: T.fg1, fontSize: 13, lineHeight: 20, flex: 1 },
  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border1, gap: 1,
    backgroundColor: T.border1,
  },
  metaCell: { backgroundColor: T.bg2, padding: 12, paddingHorizontal: 14, width: '50%' },
  metaKey: { color: T.fg3, fontSize: 11, letterSpacing: 0.4, marginBottom: 3 },
  metaValue: { color: T.fg0, fontSize: 14, fontWeight: '500' },
  threadMeta: { color: T.fg2, fontSize: 11, marginBottom: 3 },
  threadText: { color: T.fg1, fontSize: 13, lineHeight: 19 },
  actionBar: {
    backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.border1,
    padding: 10, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8,
  },
  btnDiscuss: {
    flex: 1, height: 52, borderRadius: 12, backgroundColor: T.bg3,
    borderWidth: 1, borderColor: T.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  btnDiscussText: { color: T.fg0, fontSize: 14, fontWeight: '600' },
  btnReject: {
    flex: 1, height: 52, borderRadius: 12,
    borderWidth: 1, borderColor: T.err, alignItems: 'center', justifyContent: 'center',
  },
  btnRejectText: { color: T.err, fontSize: 14, fontWeight: '600' },
  btnApprove: {
    flex: 1.4, height: 52, borderRadius: 12,
    backgroundColor: T.ok, alignItems: 'center', justifyContent: 'center',
  },
  btnApproveText: { color: '#08291B', fontSize: 14, fontWeight: '700' },
});
