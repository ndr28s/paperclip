// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { T } from '../tokens';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { useCompanyData } from '../hooks/useApi';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AGENT_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

const ENTITY_ICON: Record<string, string> = {
  issue: 'note', agent: 'sparkle', approval: 'ask', meeting: 'msg', project: 'folder',
};

const ACTION_LABELS: Record<string, string> = {
  'issue.created': 'created an issue',
  'issue.updated': 'updated an issue',
  'issue.status_changed': 'changed issue status',
  'issue.comment_added': 'commented on an issue',
  'issue.assigned': 'assigned an issue',
  'agent.created': 'added an agent',
  'agent.updated': 'updated an agent',
  'agent.status_changed': 'changed agent status',
  'project.created': 'created a project',
  'project.updated': 'updated a project',
  'approval.created': 'requested approval',
  'approval.approved': 'approved a request',
  'approval.rejected': 'rejected a request',
  'meeting_session.created': 'started a meeting',
};

type KindFilter = 'all' | string;

const KIND_FILTERS: { id: KindFilter; label: string; icon: string }[] = [
  { id: 'all',      label: 'All',      icon: 'list'    },
  { id: 'note',     label: 'Issue',    icon: 'note'    },
  { id: 'sparkle',  label: 'Agent',    icon: 'sparkle' },
  { id: 'ask',      label: 'Approval', icon: 'ask'     },
  { id: 'msg',      label: 'Meeting',  icon: 'msg'     },
  { id: 'folder',   label: 'Project',  icon: 'folder'  },
];

const SECTION_ORDER = ['today', 'yesterday', 'this_week', 'older'] as const;
const SECTION_LABELS: Record<string, string> = {
  today: 'Today', yesterday: 'Yesterday', this_week: 'This week', older: 'Earlier',
};


function getSection(dateStr: string): string {
  if (!dateStr) return 'older';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / 3600000;
  if (hours < 24) return 'today';
  if (hours < 48) return 'yesterday';
  if (hours < 168) return 'this_week';
  return 'older';
}

export const ActivityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const { data, loading } = useCompanyData<any[]>('/activity');

  const events = (data ?? []).map((ev: any) => {
    const evIcon = ENTITY_ICON[ev.entityType ?? ''] ?? 'note';
    return {
      id: ev.id,
      type: evIcon,
      description: ev.description ?? ACTION_LABELS[ev.action ?? ''] ?? ev.text ?? ev.action ?? '',
      createdAt: ev.createdAt,
      agentName: ev.details?.agentName ?? ev.agentId?.slice(0, 8) ?? 'System',
      agentColor: agentColor(ev.agentId ?? ev.actorId ?? ''),
      section: ev.at ?? (ev.createdAt ? getSection(ev.createdAt) : 'older'),
    };
  });

  const filtered = events.filter(ev => {
    if (kindFilter !== 'all' && ev.type !== kindFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return ev.description.toLowerCase().includes(q) || ev.agentName.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by section
  const grouped: Record<string, typeof filtered> = { today: [], yesterday: [], this_week: [], older: [] };
  filtered.forEach(ev => {
    const key = ev.section in grouped ? ev.section : 'older';
    grouped[key].push(ev);
  });

  return (
    <View style={styles.container}>
      <PageHeader title="Activity" subtitle={`${events.length} events`} showBack onBack={() => navigation.goBack()} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={T.fg3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activity…"
            placeholderTextColor={T.fg3}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="x" size={14} color={T.fg3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Kind filter pills */}
      <View style={{ height: 46 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {KIND_FILTERS.map(f => {
            const on = f.id === kindFilter;
            const count = f.id === 'all' ? events.length : events.filter(e => e.type === f.id).length;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setKindFilter(f.id)}
                style={[styles.filterPill, on && styles.filterPillOn]}
              >
                <Icon name={f.icon} size={13} color={on ? T.fg0 : T.fg2} />
                <Text style={[styles.filterLabel, on && styles.filterLabelOn]}>{f.label}</Text>
                <Text style={[styles.filterCount, { color: on ? T.fg2 : T.fg3 }]}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No activity matches those filters</Text>
            </View>
          ) : SECTION_ORDER.map(sec => {
            const items = grouped[sec];
            if (!items || items.length === 0) return null;
            return (
              <View key={sec}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{SECTION_LABELS[sec]}</Text>
                  <Text style={styles.sectionCount}>{items.length}</Text>
                </View>
                <View style={{ position: 'relative' }}>
                  <View style={styles.timelineLine} />
                  {items.map((ev, i) => {
                    const timeStr = ev.createdAt ? timeAgo(ev.createdAt) : '';
                    return (
                      <View key={ev.id ?? i} style={styles.row}>
                        <View style={styles.iconWrap}>
                          <Icon name={ev.type ?? 'note'} size={13} color={T.fg2} />
                        </View>
                        <View style={{ flex: 1, paddingTop: 2 }}>
                          <Text style={styles.rowText}>
                            <Text style={{ color: ev.agentColor, fontWeight: '600' }}>{ev.agentName}</Text>
                            {'  '}
                            <Text style={{ color: T.fg1 }}>{ev.description}</Text>
                          </Text>
                          <Text style={styles.rowTime}>{timeStr}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  searchWrap: { padding: 12, paddingBottom: 6 },
  searchBox: {
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  searchInput: { flex: 1, color: T.fg0, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, alignItems: 'center' },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999,
    borderWidth: 1, borderColor: T.border1,
  },
  filterPillOn: { backgroundColor: T.bg3, borderColor: T.borderStrong },
  filterLabel: { color: T.fg2, fontSize: 13, fontWeight: '500' },
  filterLabelOn: { color: T.fg0 },
  filterCount: { fontFamily: 'monospace', fontSize: 11 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  sectionLabel: { color: T.fg0, fontSize: 14, fontWeight: '600' },
  sectionCount: { fontFamily: 'monospace', fontSize: 12, color: T.fg3 },
  timelineLine: {
    position: 'absolute', left: 16 + 14, top: 0, bottom: 0,
    width: 1, backgroundColor: T.border1,
  },
  row: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: T.bg2,
    borderWidth: 1, borderColor: T.border1,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  rowText: { fontSize: 13, lineHeight: 18, color: T.fg1 },
  rowTime: { fontFamily: 'monospace', fontSize: 11, color: T.fg3, marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: T.fg3, fontSize: 14 },
});
