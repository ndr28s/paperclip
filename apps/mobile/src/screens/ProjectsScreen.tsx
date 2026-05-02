// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { T } from '../tokens';
import { Progress } from '../components/Progress';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { useCompanyData } from '../hooks/useApi';
import { useCompany } from '../context/CompanyContext';
import { api } from '../api/client';

type FilterId = 'All' | 'Active' | 'Paused' | 'Backlog';
const FILTERS: FilterId[] = ['All', 'Active', 'Paused', 'Backlog'];

type ProjectStatus = 'active' | 'paused' | 'backlog';

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  active:  { bg: T.okBg,   fg: T.ok,  label: 'ACTIVE' },
  paused:  { bg: T.pauseBg, fg: T.fg2, label: 'PAUSED' },
  backlog: { bg: T.bg3,    fg: T.fg2, label: 'BACKLOG' },
};

const STATUS_OPTIONS: { id: ProjectStatus; label: string; color: string; bg: string }[] = [
  { id: 'active',  label: 'Active',  color: T.ok,  bg: T.okBg },
  { id: 'paused',  label: 'Paused',  color: T.fg2, bg: T.pauseBg },
  { id: 'backlog', label: 'Backlog', color: T.fg2, bg: T.bg3 },
];

const AGENT_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function mapProject(p: any) {
  const name = p.name ?? 'Project';
  return {
    id: p.id,
    name,
    mark: name.slice(0, 2).toUpperCase(),
    color: p.color || agentColor(p.id ?? ''),
    status: p.status ?? 'active',
    progress: 0,
    issues: 0,
    description: p.description ?? '',
  };
}

export const ProjectsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [filter, setFilter] = useState<FilterId>('All');
  const { data, loading, reload } = useCompanyData<any[]>('/projects');
  const { companyId } = useCompany();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setName('');
    setDescription('');
    setStatus('active');
    setError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/companies/${companyId}/projects`, {
        name: name.trim(),
        description: description.trim(),
        status,
      });
      setModalVisible(false);
      reload();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const projects = (data ?? []).map(mapProject);

  const visible = filter === 'All' ? projects : projects.filter(p =>
    p.status === filter.toLowerCase()
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total · ${projects.filter(p => p.status === 'active').length} active`}
        right={
          <TouchableOpacity onPress={openModal} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
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

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: T.fg3, fontSize: 14 }}>No projects found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {visible.map(p => {
            const sp = STATUS_PILL[p.status] ?? STATUS_PILL.active;
            return (
              <Card key={p.id} style={styles.projectCard} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })}>
                {/* Top row: mark + status */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={[styles.mark, { backgroundColor: p.color }]}>
                    <Text style={styles.markText}>{p.mark}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: sp.bg }]}>
                    <Text style={[styles.statusText, { color: sp.fg }]}>{sp.label}</Text>
                  </View>
                </View>

                {/* Name */}
                <Text style={styles.projectName}>{p.name}</Text>

                {/* Progress */}
                <View>
                  <Progress value={p.progress} color={p.color} />
                  <View style={styles.progressMeta}>
                    <Text style={styles.mono}>{Math.round(p.progress * 100)}%</Text>
                    <Text style={styles.mono}>{p.issues} issues</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* New Project Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={styles.sheet}>
            {/* Sheet handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>New Project</Text>

            {/* Name field */}
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Project name"
              placeholderTextColor={T.fg3}
              autoFocus
              returnKeyType="next"
            />

            {/* Description field */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description"
              placeholderTextColor={T.fg3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Status pills */}
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map(opt => {
                const active = status === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setStatus(opt.id)}
                    style={[
                      styles.statusOption,
                      { backgroundColor: active ? opt.bg : T.bg2 },
                      active && { borderColor: opt.color, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.statusOptionText, { color: active ? opt.color : T.fg2 }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Error */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={closeModal}
                disabled={submitting}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCreate, (!name.trim() || submitting) && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={!name.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  addButton: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 22, fontWeight: '400', lineHeight: 28, marginTop: -1 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, alignItems: 'center' },
  filterPill: {
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999,
    borderWidth: 1, borderColor: T.border1,
  },
  filterPillOn: { backgroundColor: T.bg3, borderColor: T.borderStrong },
  filterText: { color: T.fg2, fontSize: 13, fontWeight: '500' },
  filterTextOn: { color: T.fg0 },
  grid: {
    padding: 16, paddingTop: 8,
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  projectCard: { width: '47.5%', padding: 14, gap: 10 },
  mark: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  statusPill: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
  projectName: { color: T.fg0, fontSize: 15, fontWeight: '600', lineHeight: 20, minHeight: 40 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  mono: { fontFamily: 'monospace', fontSize: 11, color: T.fg3 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: T.bg1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    gap: 4,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: T.border1,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: T.fg0, fontSize: 18, fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    color: T.fg2, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.4, marginBottom: 6, marginTop: 12,
  },
  input: {
    backgroundColor: T.bg2,
    borderWidth: 1, borderColor: T.border1,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: T.fg0, fontSize: 15,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 10,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  statusOption: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  statusOptionText: { fontSize: 13, fontWeight: '600' },
  errorText: {
    color: T.error ?? '#E8524A',
    fontSize: 13,
    marginTop: 10,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancel: { backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1 },
  btnCancelText: { color: T.fg1, fontSize: 15, fontWeight: '600' },
  btnCreate: { backgroundColor: T.accent },
  btnCreateText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});
