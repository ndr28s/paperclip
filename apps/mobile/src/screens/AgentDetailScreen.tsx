// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { T } from '../tokens';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { Progress } from '../components/Progress';
import { Card } from '../components/Card';
import { SectionHeader, PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import type { RootStackParamList } from '../navigation';
import { useItemData } from '../hooks/useApi';
import { useCompany } from '../context/CompanyContext';
import { api } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'AgentDetail'>;

const STATE_COLOR: Record<string, string> = { shipped: T.ok, failed: T.err, review: T.warn };
const STATE_ICON: Record<string, string> = { shipped: 'check', failed: 'x', review: 'edit' };

const AGENT_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function mapAgent(raw: any) {
  const name = raw.name ?? raw.id ?? 'Agent';
  return {
    id: raw.id,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    color: agentColor(raw.id ?? ''),
    role: raw.title || raw.role || 'Agent',
    status: raw.status ?? 'idle',
    task: raw.title || raw.role || 'Working...',
    spent: (raw.spentMonthlyCents ?? 0) / 100,
    budget: (raw.budgetMonthlyCents ?? 10000) / 100,
    tools: raw.adapterConfig?.tools ?? [],
    tasks24: raw.tasks24 ?? 0,
    tokens24: raw.tokens24 ?? '0',
    workHistory: raw.workHistory ?? [],
  };
}

// ── Assign Task Modal ─────────────────────────────────────
const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: T.fg3, medium: T.fg2, high: T.warn, urgent: T.err,
};

function AssignTaskModal({ visible, agent, companyId, onClose }: {
  visible: boolean;
  agent: { id: string; name: string; color: string };
  companyId: string | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setTitle(''); setDescription(''); setPriority('medium');
    setSubmitting(false); setDone(false);
  }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!title.trim() || !companyId) return;
    setSubmitting(true);
    try {
      await api.post(`/companies/${companyId}/issues`, {
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeAgentId: agent.id,
        status: 'backlog',
        priority,
      });
      // Wake up agent (best-effort)
      try {
        await api.post(`/agents/${agent.id}/wakeup`, { source: 'assignment' });
      } catch (_) {}
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create task');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={ms.sheet}>
          {/* Handle */}
          <View style={ms.handle} />

          {/* Header */}
          <View style={ms.header}>
            <Text style={ms.headerTitle}>{done ? '✅ Task created' : `Assign task to ${agent.name}`}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={18} color={T.fg2} />
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={ms.doneBody}>
              <View style={[ms.agentDot, { backgroundColor: agent.color }]}>
                <Text style={ms.agentDotText}>{agent.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={ms.doneTitle}>Task assigned to {agent.name}</Text>
              <Text style={ms.doneSub}>The agent has been notified and will pick it up shortly.</Text>
              <TouchableOpacity style={ms.doneBtn} onPress={handleClose}>
                <Text style={ms.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ms.body}>
              {/* Title */}
              <Text style={ms.label}>Task title *</Text>
              <TextInput
                style={ms.input}
                placeholder="e.g. Fix login bug, Write unit tests…"
                placeholderTextColor={T.fg3}
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="next"
              />

              {/* Description */}
              <Text style={[ms.label, { marginTop: 14 }]}>Description (optional)</Text>
              <TextInput
                style={[ms.input, ms.inputMulti]}
                placeholder="Add context, requirements, or links…"
                placeholderTextColor={T.fg3}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Priority */}
              <Text style={[ms.label, { marginTop: 14 }]}>Priority</Text>
              <View style={ms.priorityRow}>
                {PRIORITIES.map(p => {
                  const on = p.id === priority;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[ms.priorityPill, on && { borderColor: PRIORITY_COLOR[p.id], backgroundColor: PRIORITY_COLOR[p.id] + '20' }]}
                      onPress={() => setPriority(p.id)}
                    >
                      <Text style={[ms.priorityText, { color: on ? PRIORITY_COLOR[p.id] : T.fg2 }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[ms.submitBtn, (!title.trim() || submitting) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!title.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={ms.submitText}>Assign task</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────
export const AgentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const agentId = route.params.agentId;
  const { data: raw, loading } = useItemData<any>(`/agents/${agentId}`);
  const { companyId } = useCompany();
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  if (!raw) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: T.fg3, fontSize: 14 }}>Agent not found</Text>
      </View>
    );
  }

  const a = mapAgent(raw);

  return (
    <View style={styles.container}>
      <PageHeader
        title={a.name}
        subtitle={a.role}
        showBack
        onBack={() => navigation.goBack()}
        right={<Icon name="more" size={20} color={T.fg1} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View style={styles.section}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <Avatar agent={a} size={56} dot />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName}>{a.name}</Text>
                <Text style={styles.heroRole}>{a.role}</Text>
                <View style={{ marginTop: 8 }}>
                  <Pill status={a.status} size="lg" />
                </View>
              </View>
            </View>
            <View style={[styles.taskBox, { borderLeftColor: a.color }]}>
              <Text style={styles.taskNowLabel}>NOW</Text>
              <Text style={styles.taskText}>{a.task}</Text>
            </View>
          </Card>
        </View>

        {/* 24h stats */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            {[['Tasks', String(a.tasks24)], ['Tokens', a.tokens24], ['Spent', `$${(a.spent / 4).toFixed(0)}`]].map(([l, v], i) => (
              <Card key={i} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
                <Text style={styles.statValue}>{v}</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </Card>
            ))}
          </View>
          <Text style={styles.statsCaption}>LAST 24 HOURS</Text>
        </View>

        {/* Budget */}
        <SectionHeader title="Monthly budget" />
        <View style={styles.section}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <Text style={styles.budgetAmount}>
                ${a.spent.toFixed(2)}{' '}
                <Text style={styles.budgetOf}>/ ${a.budget.toFixed(0)}</Text>
              </Text>
              <Text style={styles.budgetPct}>{a.budget > 0 ? Math.round(a.spent / a.budget * 100) : 0}% used</Text>
            </View>
            <Progress value={a.budget > 0 ? a.spent / a.budget : 0} color={a.color} height={8} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.mono}>Apr 1</Text>
              <Text style={styles.mono}>Today</Text>
              <Text style={styles.mono}>Apr 30</Text>
            </View>
          </Card>
        </View>

        {/* Tools */}
        {a.tools.length > 0 && (
          <>
            <SectionHeader title="Tools & integrations" />
            <View style={[styles.section, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
              {a.tools.map((t: string) => (
                <View key={t} style={styles.toolChip}>
                  <Text style={styles.toolText}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent work */}
        {a.workHistory.length > 0 && (
          <>
            <SectionHeader title="Recent work" action="See all →" />
            <View style={[styles.section, { gap: 1 }]}>
              {a.workHistory.map((w: any, i: number) => {
                const c = STATE_COLOR[w.state] ?? T.fg2;
                return (
                  <View key={i} style={[styles.workRow, {
                    borderTopLeftRadius: i === 0 ? 12 : 0,
                    borderTopRightRadius: i === 0 ? 12 : 0,
                    borderBottomLeftRadius: i === a.workHistory.length - 1 ? 12 : 0,
                    borderBottomRightRadius: i === a.workHistory.length - 1 ? 12 : 0,
                    borderBottomWidth: i < a.workHistory.length - 1 ? 1 : 0,
                  }]}>
                    <View style={[styles.workStateIcon, { backgroundColor: c + '22' }]}>
                      <Icon name={STATE_ICON[w.state] ?? 'check'} size={14} color={c} />
                    </View>
                    <Text style={styles.workTitle} numberOfLines={2}>{w.title}</Text>
                    <Text style={styles.mono}>{w.when}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Meetings')}
        >
          <Icon name="msg" size={16} color={T.fg0} />
          <Text style={styles.btnSecondaryText}>Meeting</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.7}
          onPress={() => setAssignModalOpen(true)}
        >
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>Assign Task</Text>
        </TouchableOpacity>
      </View>

      <AssignTaskModal
        visible={assignModalOpen}
        agent={a}
        companyId={companyId}
        onClose={() => setAssignModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  section: { paddingHorizontal: 16, marginBottom: 0 },
  heroName: { color: T.fg0, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  heroRole: { color: T.fg2, fontSize: 13, marginTop: 2 },
  taskBox: {
    marginTop: 14, padding: 10, paddingHorizontal: 12,
    backgroundColor: T.bg3, borderRadius: 10,
    borderLeftWidth: 3,
  },
  taskNowLabel: { color: T.fg3, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  taskText: { color: T.fg1, fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statValue: { fontFamily: 'monospace', fontSize: 22, fontWeight: '700', color: T.fg0, letterSpacing: -0.4 },
  statLabel: { color: T.fg2, fontSize: 12, marginTop: 2 },
  statsCaption: { color: T.fg3, fontSize: 11, textAlign: 'center', marginTop: 6, letterSpacing: 0.4, textTransform: 'uppercase' },
  budgetAmount: { fontFamily: 'monospace', fontSize: 17, fontWeight: '600', color: T.fg0 },
  budgetOf: { color: T.fg3, fontWeight: '400' },
  budgetPct: { color: T.fg2, fontSize: 12 },
  mono: { fontFamily: 'monospace', fontSize: 11, color: T.fg3 },
  toolChip: { backgroundColor: T.bg3, borderWidth: 1, borderColor: T.border1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  toolText: { color: T.fg1, fontSize: 12 },
  workRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingHorizontal: 14, backgroundColor: T.bg2,
    borderBottomColor: T.border1,
  },
  workStateIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  workTitle: { flex: 1, color: T.fg1, fontSize: 14, lineHeight: 18 },
  actionBar: {
    backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.border1,
    padding: 10, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', gap: 8,
  },
  btnSecondary: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: T.bg3,
    borderWidth: 1, borderColor: T.borderStrong,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnSecondaryText: { color: T.fg0, fontSize: 15, fontWeight: '600' },
  btnPrimary: {
    flex: 1.5, height: 48, borderRadius: 12, backgroundColor: T.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

// ── Modal styles ──────────────────────────────────────────
const ms = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: T.bg1,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0, borderColor: T.border1,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: T.bg4, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border1,
  },
  headerTitle: { color: T.fg0, fontSize: 16, fontWeight: '600' },
  body: { padding: 18, paddingBottom: 32 },
  label: { color: T.fg2, fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginBottom: 6 },
  input: {
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1,
    borderRadius: 10, padding: 12, color: T.fg0, fontSize: 14,
  },
  inputMulti: { minHeight: 88, paddingTop: 10 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: T.border1,
    alignItems: 'center',
  },
  priorityText: { fontSize: 13, fontWeight: '500' },
  submitBtn: {
    marginTop: 22, height: 50, borderRadius: 12,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBody: { padding: 32, alignItems: 'center' },
  agentDot: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  agentDotText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  doneTitle: { color: T.fg0, fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  doneSub: { color: T.fg2, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 24 },
  doneBtn: { height: 44, paddingHorizontal: 32, borderRadius: 10, backgroundColor: T.bg3, borderWidth: 1, borderColor: T.borderStrong, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: T.fg0, fontSize: 14, fontWeight: '600' },
});
