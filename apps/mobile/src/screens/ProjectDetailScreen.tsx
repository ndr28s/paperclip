// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { T } from '../tokens';
import { Progress } from '../components/Progress';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import type { RootStackParamList } from '../navigation';
import { useItemData, useCompanyData } from '../hooks/useApi';
import { useCompany } from '../context/CompanyContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

type TabId = 'overview' | 'issues';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'issues',   label: 'Issues'   },
];

const PRIORITY_COLOR: Record<string, string> = { urgent: T.err, high: T.warn, med: T.fg2, low: T.fg3 };

const STATUS_MAP: Record<string, string> = {
  backlog: 'backlog',
  in_progress: 'progress',
  in_review: 'review',
  done: 'done',
  progress: 'progress',
  review: 'review',
};

export const ProjectDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const projectId = route.params.projectId;
  const { data: raw, loading: projectLoading } = useItemData<any>(`/projects/${projectId}`);
  const { data: issuesData, loading: issuesLoading } = useCompanyData<any[]>(`/issues?projectId=${projectId}`);
  const [tab, setTab] = useState<TabId>('overview');

  const loading = projectLoading || issuesLoading;

  if (loading && !raw) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  if (!raw) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: T.fg3, fontSize: 14 }}>Project not found</Text>
      </View>
    );
  }

  const PROJ_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
  const _pid = raw.id ?? '';
  let _phash = 0;
  for (let i = 0; i < _pid.length; i++) _phash = ((_phash << 5) - _phash) + _pid.charCodeAt(i);
  const _fallbackColor = PROJ_COLORS[Math.abs(_phash) % PROJ_COLORS.length];

  const name = raw.name ?? 'Project';
  const color = raw.color || _fallbackColor;
  const mark = name.slice(0, 2).toUpperCase();
  const status = raw.status ?? 'active';
  const progress = 0; // not in API response
  const description = raw.description ?? '';

  const projectIssues = (issuesData ?? []).map((i: any) => ({
    id: i.id,
    title: i.title ?? '',
    priority: i.priority ?? 'low',
    status: STATUS_MAP[i.status] ?? i.status ?? 'backlog',
    assigneeId: i.assigneeId ?? '',
    due: i.due ?? i.dueDate ?? '',
  }));

  const doneCount = projectIssues.filter(i => i.status === 'done').length;
  const openCount = projectIssues.filter(i => i.status !== 'done').length;

  return (
    <View style={styles.container}>
      <PageHeader title={name} showBack onBack={() => navigation.goBack()} />

      {/* Project hero */}
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: color }]}>
          <Text style={styles.markText}>{mark}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.projectName}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={[styles.statusPill, { backgroundColor: status === 'active' ? T.okBg : T.pauseBg }]}>
              <Text style={[styles.statusText, { color: status === 'active' ? T.ok : T.fg2 }]}>
                {status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.metaText}>{openCount} open · {doneCount} done</Text>
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const on = t.id === tab;
          return (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'overview' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {/* Progress card */}
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={styles.cardTitle}>Progress</Text>
              <Text style={styles.pctText}>{Math.round(progress * 100)}%</Text>
            </View>
            <Progress value={progress} color={color} height={8} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={styles.mono}>{doneCount} done</Text>
              <Text style={styles.mono}>{openCount} open</Text>
            </View>
          </Card>

          {/* Description card */}
          {description ? (
            <Card style={{ padding: 16 }}>
              <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Description</Text>
              <Text style={{ color: T.fg1, fontSize: 14, lineHeight: 20 }}>{description}</Text>
            </Card>
          ) : null}

          {/* Stats grid */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Issues', value: String(projectIssues.length) },
              { label: 'Progress', value: `${Math.round(progress * 100)}%` },
            ].map((s, i) => (
              <Card key={i} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {projectIssues.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: T.fg3, fontSize: 14 }}>No issues for this project</Text>
            </View>
          ) : projectIssues.map((iss: any, i: number) => {
            const pColor = PRIORITY_COLOR[iss.priority] ?? T.fg3;
            return (
              <View key={iss.id} style={[styles.issueRow, i === 0 && styles.issueRowFirst]}>
                <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.issueId}>{iss.id}</Text>
                  <Text style={styles.issueTitle} numberOfLines={2}>{iss.title}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.mono}>{iss.due}</Text>
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
  hero: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border1,
    backgroundColor: T.bg1,
  },
  mark: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.4 },
  projectName: { color: T.fg0, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  statusPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  metaText: { color: T.fg2, fontSize: 12 },
  tabBar: {
    flexDirection: 'row', backgroundColor: T.bg1,
    borderBottomWidth: 1, borderBottomColor: T.border1,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: T.accent },
  tabText: { color: T.fg2, fontSize: 14, fontWeight: '500' },
  tabTextOn: { color: T.fg0, fontWeight: '600' },
  cardTitle: { color: T.fg0, fontSize: 15, fontWeight: '600' },
  pctText: { color: T.fg0, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  mono: { fontFamily: 'monospace', fontSize: 11, color: T.fg3 },
  statValue: { color: T.fg0, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  statLabel: { color: T.fg2, fontSize: 12, marginTop: 3 },
  issueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border1,
  },
  issueRowFirst: { borderTopWidth: 1, borderTopColor: T.border1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  issueId: { fontFamily: 'monospace', fontSize: 11, color: T.fg3, marginBottom: 2 },
  issueTitle: { color: T.fg0, fontSize: 14, lineHeight: 18 },
});
