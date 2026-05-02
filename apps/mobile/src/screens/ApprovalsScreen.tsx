// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { T } from '../tokens';
import { Avatar } from '../components/Avatar';
import { TypeBadge } from '../components/Pill';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { useCompanyData } from '../hooks/useApi';

const AGENT_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type FilterId = 'All' | 'Urgent' | 'Deploy' | 'Spend' | 'Access' | 'Hire';
const FILTERS: FilterId[] = ['All', 'Urgent', 'Deploy', 'Spend', 'Access', 'Hire'];

export const ApprovalsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [filter, setFilter] = useState<FilterId>('All');
  const { data, loading } = useCompanyData<any[]>('/approvals');

  const approvals = data ?? [];

  const visible = filter === 'All' ? approvals
    : filter === 'Urgent' ? approvals.filter((a: any) => (a.payload as any)?.urgent === true)
    : filter === 'Hire' ? approvals.filter((a: any) => a.type === 'hire_agent' || a.type === 'hire')
    : approvals.filter((a: any) => a.type === filter.toLowerCase());

  return (
    <View style={styles.container}>
      <PageHeader
        title="Approvals"
        subtitle={`${approvals.length} waiting · ${approvals.filter((a: any) => (a.payload as any)?.urgent === true).length} urgent`}
        right={
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{approvals.length}</Text>
          </View>
        }
      />

      {/* Filter pills */}
      <View style={{ height: 46, marginTop: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const on = f === filter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterPill, on && styles.filterPillOn]}
              >
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Cards */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: T.fg3, fontSize: 14 }}>No approvals</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {visible.map((ap: any) => {
            const apAgentName = ap.agentName ?? (ap.payload as any)?.agentName ?? ap.requestedByAgentId?.slice(0, 8) ?? 'Agent';
            const apAgentColor = agentColor(ap.requestedByAgentId ?? ap.id ?? '');
            const apIsUrgent = (ap.payload as any)?.urgent === true;
            const apSummary = (ap.payload as any)?.summary ?? (ap.payload as any)?.detail ?? (ap.payload as any)?.title ?? ap.type;
            const apType = ap.type === 'hire_agent' ? 'hire' : ap.type;
            const agentInitials = apAgentName.slice(0, 2).toUpperCase();
            const agentObj = { initials: agentInitials, color: apAgentColor };
            const ageStr = ap.createdAt ? timeAgo(ap.createdAt) : (ap.age ? `${ap.age} ago` : '');
            return (
              <Card key={ap.id} style={{ padding: 14 }} onPress={() => navigation.navigate('ApprovalDetail', { approvalId: ap.id })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TypeBadge type={apType} />
                    {apIsUrgent && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Icon name="zap" size={12} color={T.err} />
                        <Text style={styles.urgentText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ageText}>{ageStr}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <Avatar agent={agentObj} size={24} />
                  <Text style={styles.agentName}>{apAgentName}</Text>
                </View>
                <Text style={styles.summary} numberOfLines={2}>{apSummary}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.reviewText}>Review</Text>
                    <Icon name="arrow" size={14} color={T.accent} />
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  countBadge: {
    minWidth: 24, height: 22, borderRadius: 999, backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, alignItems: 'center' },
  filterPill: {
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
    borderWidth: 1, borderColor: T.border1,
  },
  filterPillOn: { backgroundColor: T.bg3, borderColor: T.borderStrong },
  filterText: { color: T.fg2, fontSize: 13, fontWeight: '500' },
  filterTextOn: { color: T.fg0 },
  list: { padding: 16, gap: 10, paddingTop: 6 },
  urgentText: { color: T.err, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  ageText: { fontFamily: 'monospace', fontSize: 11, color: T.fg3 },
  agentName: { color: T.fg1, fontSize: 13, fontWeight: '500' },
  dot: { color: T.fg3, fontSize: 12 },
  impact: { color: T.fg2, fontSize: 12, flex: 1 },
  summary: { color: T.fg1, fontSize: 13, lineHeight: 20 },
  reviewText: { color: T.accent, fontSize: 13, fontWeight: '600' },
});
