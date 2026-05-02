import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { T } from '../tokens';
import { AGENTS } from '../data';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { api } from '../api/client';
import { useCompanyId, useActiveSession, useMeetingMessages } from '../api/hooks';
import type { RawMeetingMessage } from '../api/types';

function relativeTime(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

interface MessageBubbleProps {
  msg: RawMeetingMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg }) => {
  const isUser = !!msg.authorUserId && !msg.authorAgentId;
  const agent = msg.authorAgentId ? AGENTS.find(a => a.id === msg.authorAgentId) : null;
  const timeStr = relativeTime(msg.createdAt);

  if (isUser) {
    return (
      <View style={styles.rowUser}>
        <View style={styles.bubbleUser}>
          <Text style={styles.bubbleTextUser}>{msg.body}</Text>
        </View>
        <Text style={styles.bubbleTime}>{timeStr}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rowAgent}>
      <View style={[styles.agentDot, { backgroundColor: agent?.color ?? T.accent }]}>
        <Text style={styles.agentDotText}>{agent?.initials ?? 'AI'}</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '80%' }}>
        <Text style={styles.agentName}>
          {agent ? `${agent.name} · ${agent.role}` : 'Agent'}
        </Text>
        <View style={styles.bubbleAgent}>
          <Text style={styles.bubbleTextAgent}>{msg.body}</Text>
        </View>
        <Text style={styles.bubbleTime}>{timeStr}</Text>
      </View>
    </View>
  );
};

export const MeetingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const companyId = useCompanyId();
  const { data: session, loading: sessionLoading, refetch: refetchSession } = useActiveSession(companyId);
  const hasSession = !!(session && !session.endedAt);
  const { data: messages, refetch: refetchMessages } = useMeetingMessages(
    companyId,
    hasSession ? session!.id : null,
  );

  const sessionAgent = session?.agentId ? AGENTS.find(a => a.id === session.agentId) : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages?.length]);

  const handleStart = useCallback(async () => {
    if (!companyId || actionLoading) return;
    setActionLoading(true);
    try {
      await api.post(`/companies/${companyId}/meeting-sessions`, { agentId: null });
      refetchSession();
    } catch (err) {
      console.error('Failed to start meeting:', err);
    } finally {
      setActionLoading(false);
    }
  }, [companyId, actionLoading, refetchSession]);

  const handleEnd = useCallback(async () => {
    if (!companyId || !session || actionLoading) return;
    setActionLoading(true);
    try {
      await api.delete(`/companies/${companyId}/meeting-sessions/${session.id}`);
      refetchSession();
    } catch (err) {
      console.error('Failed to end meeting:', err);
    } finally {
      setActionLoading(false);
    }
  }, [companyId, session, actionLoading, refetchSession]);

  const handleSend = useCallback(async () => {
    if (!companyId || !session || !inputText.trim() || sending) return;
    const body = inputText.trim();
    setSending(true);
    setInputText('');
    try {
      await api.post(`/companies/${companyId}/meeting-sessions/${session.id}/messages`, { body });
      refetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(body); // restore on failure
    } finally {
      setSending(false);
    }
  }, [companyId, session, inputText, sending, refetchMessages]);

  const headerRight = hasSession ? (
    <TouchableOpacity
      onPress={handleEnd}
      style={styles.endBtn}
      disabled={actionLoading}
      activeOpacity={0.7}
    >
      <Text style={styles.endBtnText}>End</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <View style={styles.container}>
      <PageHeader
        title="Meetings"
        showBack
        onBack={() => navigation.goBack()}
        right={headerRight}
      />

      {sessionLoading && !session ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : !hasSession ? (
        /* ── Empty state ── */
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Icon name="msg" size={28} color={T.fg3} />
          </View>
          <Text style={styles.emptyTitle}>No active meeting</Text>
          <Text style={styles.emptySub}>Start a meeting to talk with your agents in real time.</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStart}
            disabled={!companyId || actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Icon name="plus" size={16} color="#fff" /><Text style={styles.startBtnText}>Start meeting</Text></>
            }
          </TouchableOpacity>
          {!companyId && (
            <Text style={styles.offlineNote}>Connect to a workspace to use Meetings.</Text>
          )}
        </View>
      ) : (
        /* ── Active session ── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Session status bar */}
          <View style={styles.sessionBar}>
            <View style={[styles.sessionAvatar, { backgroundColor: sessionAgent?.color ?? T.accent }]}>
              <Text style={styles.sessionAvatarText}>{sessionAgent?.initials ?? 'MT'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sessionName}>
                {sessionAgent ? sessionAgent.name : 'Meeting'}
                {sessionAgent ? ` · ${sessionAgent.role}` : ''}
              </Text>
              <Text style={styles.sessionMeta}>
                Started {relativeTime(session!.createdAt)} ago
                {'  '}
                <Text style={{ color: T.ok }}>● Live</Text>
              </Text>
            </View>
            <Text style={styles.msgCount}>{messages?.length ?? 0} msgs</Text>
          </View>

          {/* Transcript */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.transcript}
            showsVerticalScrollIndicator={false}
          >
            {(!messages || messages.length === 0) ? (
              <View style={styles.systemMsg}>
                <Text style={styles.systemMsgText}>Meeting started</Text>
              </View>
            ) : messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </ScrollView>

          {/* Composer */}
          <View style={styles.composer}>
            <View style={styles.composerInner}>
              <TextInput
                style={styles.composerInput}
                placeholder={sessionAgent ? `Reply to ${sessionAgent.name}…` : 'Type a message…'}
                placeholderTextColor={T.fg3}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                editable={!sending}
                returnKeyType="default"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={sending || !inputText.trim()}
                style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Icon name="arrow" size={18} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: T.bg2,
    borderWidth: 1, borderColor: T.border1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { color: T.fg0, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: T.fg2, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.accent, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, height: 48,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  offlineNote: { color: T.fg3, fontSize: 12, marginTop: 12, textAlign: 'center' },
  endBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: T.err,
  },
  endBtnText: { color: T.err, fontSize: 13, fontWeight: '600' },
  sessionBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border1,
    padding: 12, paddingHorizontal: 16,
  },
  sessionAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionAvatarText: { color: 'rgba(0,0,0,0.7)', fontSize: 13, fontWeight: '700' },
  sessionName: { color: T.fg0, fontSize: 13, fontWeight: '600' },
  sessionMeta: { color: T.fg2, fontSize: 12, marginTop: 1 },
  msgCount: { fontFamily: 'monospace', fontSize: 11, color: T.fg3 },
  transcript: { padding: 16, gap: 16, paddingBottom: 8 },
  systemMsg: {
    alignItems: 'center', paddingVertical: 8,
  },
  systemMsgText: {
    color: T.fg3, fontSize: 12,
    backgroundColor: T.bg2, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
  },
  rowUser: { alignItems: 'flex-end', gap: 4 },
  rowAgent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bubbleUser: {
    backgroundColor: T.accent, borderRadius: 16, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%',
  },
  bubbleTextUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bubbleAgent: {
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 4,
  },
  bubbleTextAgent: { color: T.fg1, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: T.fg3, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  agentDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
  },
  agentDotText: { color: 'rgba(0,0,0,0.7)', fontSize: 11, fontWeight: '700' },
  agentName: { color: T.fg2, fontSize: 11 },
  composer: {
    backgroundColor: T.bg1, borderTopWidth: 1, borderTopColor: T.border1,
    padding: 10, paddingHorizontal: 12, paddingBottom: 12,
  },
  composerInner: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
  },
  composerInput: {
    flex: 1, color: T.fg0, fontSize: 14, lineHeight: 20,
    maxHeight: 120, padding: 0,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: T.bg4 },
});
