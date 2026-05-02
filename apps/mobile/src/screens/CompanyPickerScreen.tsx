// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../tokens';
import { useCompany, Company } from '../context/CompanyContext';
import { useSession } from '../context/SessionContext';

export function CompanyPickerScreen({ navigation }: { navigation?: any }) {
  const insets = useSafeAreaInsets();
  const { companies, loading, fetched, switchCompany, createCompany, reload } = useCompany();
  const { logout } = useSession();
  const canGoBack = navigation?.canGoBack?.();

  // 화면 열릴 때마다 최신 목록 갱신 (다른 앱에서 추가/삭제 반영)
  useEffect(() => { reload(); }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCompany(newName.trim());
      setShowCreate(false);
      setNewName('');
    } catch (e) {
      Alert.alert('오류', (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  const COLORS = ['#4A90E2', '#A06CD5', '#34C98A', '#E8524A', '#F5A623', '#C078E0'];

  function getColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        {canGoBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>← 뒤로</Text>
          </TouchableOpacity>
        )}
        <Text style={s.title}>워크스페이스 선택</Text>
        <Text style={s.sub}>소속 회사를 선택해주세요</Text>
      </View>

      {/* List */}
      {loading && !fetched ? (
        <View style={s.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>소속된 회사가 없습니다.</Text>
              <Text style={s.emptySubText}>새 회사를 추가하세요.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => { switchCompany(item); if (canGoBack) navigation.goBack(); }} activeOpacity={0.7}>
              <View style={[s.avatar, { backgroundColor: getColor(item.name) }]}>
                <Text style={s.avatarText}>{getInitial(item.name)}</Text>
              </View>
              <View style={s.rowContent}>
                <Text style={s.rowName}>{item.name}</Text>
                {item.status === 'archived' && <Text style={s.archivedBadge}>보관됨</Text>}
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Text style={s.createBtnText}>+ 새 회사 추가</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={s.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* Create modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>새 회사 추가</Text>
            <TextInput
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="회사 이름"
              placeholderTextColor={T.fg3}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, (!newName.trim() || creating) && s.btnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.confirmText}>추가</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg0 },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  backBtn: { marginBottom: 12 },
  backText: { color: T.accent, fontSize: 14, fontWeight: '500' },
  title: { color: T.fg0, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: T.fg3, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  emptyWrap: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: T.fg1, fontSize: 15, fontWeight: '600' },
  emptySubText: { color: T.fg3, fontSize: 13, marginTop: 6 },
  row: {
    backgroundColor: T.bg2, borderRadius: 12, borderWidth: 1, borderColor: T.border1,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowContent: { flex: 1, gap: 2 },
  rowName: { color: T.fg0, fontSize: 15, fontWeight: '600' },
  archivedBadge: { color: T.fg3, fontSize: 11 },
  chevron: { color: T.fg3, fontSize: 20 },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  createBtn: {
    backgroundColor: T.accentSoft, borderRadius: 10, borderWidth: 1, borderColor: T.accent,
    paddingVertical: 12, alignItems: 'center',
  },
  createBtnText: { color: T.accent, fontSize: 14, fontWeight: '600' },
  logoutBtn: { paddingVertical: 10, alignItems: 'center' },
  logoutText: { color: T.fg3, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: T.bg2, borderRadius: 14, borderWidth: 1, borderColor: T.border1, padding: 20, gap: 14 },
  modalTitle: { color: T.fg0, fontSize: 16, fontWeight: '700' },
  modalInput: { backgroundColor: T.bg3, borderRadius: 8, borderWidth: 1, borderColor: T.border1, paddingHorizontal: 12, paddingVertical: 10, color: T.fg0, fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, backgroundColor: T.bg3, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: T.fg2, fontSize: 14, fontWeight: '500' },
  confirmBtn: { flex: 1, backgroundColor: T.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
