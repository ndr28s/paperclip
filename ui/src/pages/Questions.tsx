import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { meetingsApi } from "../api/meetings";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { ApiError } from "../api/client";
import { queryKeys } from "../lib/queryKeys";
import { buildMarkdownMentionOptions } from "../lib/company-members";
import { EmptyState } from "../components/EmptyState";
import { MarkdownEditor, type MarkdownEditorRef } from "../components/MarkdownEditor";
import { MarkdownBody } from "../components/MarkdownBody";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseAgentMentionHref } from "@paperclipai/shared";
import type { MeetingMessage } from "@paperclipai/shared";
import type { Agent } from "@paperclipai/shared";

function extractMentionedAgentId(markdown: string): string | null {
  const matches = [...markdown.matchAll(/\(([^)]+)\)/g)];
  for (const match of matches) {
    const parsed = parseAgentMentionHref(match[1]);
    if (parsed?.agentId) return parsed.agentId;
  }
  return null;
}

function ChatBubble({
  message,
  agentMap,
}: {
  message: MeetingMessage;
  agentMap: Map<string, Agent>;
}) {
  const isUser = message.authorType === "user";
  const agent = message.authorAgentId ? agentMap.get(message.authorAgentId) : null;
  const agentName = message.agentName ?? agent?.name ?? null;

  return (
    <div className={cn("flex gap-2 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-accent text-accent-foreground rounded-bl-sm",
        )}
      >
        {!isUser && agentName && (
          <p className="text-[11px] font-semibold mb-1 opacity-60">{agentName}</p>
        )}
        <MarkdownBody className="prose-sm">{message.body}</MarkdownBody>
      </div>
    </div>
  );
}

export function Questions() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [body, setBody] = useState("");
  const editorRef = useRef<MarkdownEditorRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: t("questions.title") }]);
  }, [setBreadcrumbs, t]);

  // Agents + projects for @mention
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const mentionOptions = useMemo(
    () => buildMarkdownMentionOptions({ agents, projects }),
    [agents, projects],
  );
  const agentMap = useMemo(
    () => new Map((agents ?? []).map((a) => [a.id, a])),
    [agents],
  );
  const ceoAgent = useMemo(() => agents?.find((a) => a.role === "ceo"), [agents]);

  // Active session (poll every 5s in case another tab ends it)
  const {
    data: activeSession,
    error: activeSessionError,
    isLoading: sessionLoading,
  } = useQuery({
    queryKey: queryKeys.meetingSessions.active(selectedCompanyId!),
    queryFn: () => meetingsApi.getActiveSession(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const sessionId = activeSession?.id ?? null;

  // Messages (poll every 3s)
  const { data: messages } = useQuery({
    queryKey: queryKeys.meetingSessions.messages(selectedCompanyId!, sessionId ?? ""),
    queryFn: () => meetingsApi.listMessages(selectedCompanyId!, sessionId!),
    enabled: !!selectedCompanyId && !!sessionId,
    refetchInterval: 3000,
  });

  // All live runs — detect if session agent is busy
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId && !!sessionId,
    refetchInterval: 5000,
  });

  const assignedAgentId = activeSession?.agentId ?? ceoAgent?.id ?? null;
  const isResponding = useMemo(() => {
    if (!assignedAgentId || !liveRuns) return false;
    return liveRuns.some((r) => r.agentId === assignedAgentId);
  }, [assignedAgentId, liveRuns]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: (agentId?: string | null) =>
      meetingsApi.createSession(selectedCompanyId!, agentId),
    onSuccess: (session) => {
      queryClient.setQueryData(
        queryKeys.meetingSessions.active(selectedCompanyId!),
        session,
      );
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ sid, text }: { sid: string; text: string }) =>
      meetingsApi.sendMessage(selectedCompanyId!, sid, text),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.meetingSessions.messages(selectedCompanyId!, sessionId ?? ""),
      });
      setBody("");
    },
  });

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || !selectedCompanyId) return;

    let sid = sessionId;

    if (!sid) {
      const mentionedAgentId = extractMentionedAgentId(trimmed);
      const targetAgentId = mentionedAgentId ?? ceoAgent?.id ?? null;
      const session = await createSessionMutation.mutateAsync(targetAgentId);
      sid = session.id;
    }

    await sendMessageMutation.mutateAsync({ sid, text: trimmed });
  }

  async function startNewMeeting() {
    if (!selectedCompanyId) return;
    const mentionedAgentId = extractMentionedAgentId(body);
    const targetAgentId = mentionedAgentId ?? ceoAgent?.id ?? null;
    const session = await createSessionMutation.mutateAsync(targetAgentId);
    queryClient.setQueryData(
      queryKeys.meetingSessions.messages(selectedCompanyId, session.id),
      [],
    );
  }

  if (!selectedCompanyId) {
    return <EmptyState icon={MessageSquare} message={t("questions.selectCompany")} />;
  }

  const displayAgentName =
    (assignedAgentId ? agentMap.get(assignedAgentId)?.name : null) ?? ceoAgent?.name ?? "CEO";

  const isPending =
    sendMessageMutation.isPending ||
    createSessionMutation.isPending;

  const hasActiveSession = !!sessionId && !(activeSessionError instanceof ApiError && activeSessionError.status === 404);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Status bar */}
      {isResponding && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/40 text-xs text-muted-foreground shrink-0">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>{displayAgentName} 응답 중...</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(!hasActiveSession || !messages?.length) && !sessionLoading && (
          <EmptyState icon={MessageSquare} message={t("questions.noQuestionsYet")} />
        )}
        {messages?.map((message) => (
          <ChatBubble key={message.id} message={message} agentMap={agentMap} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4 shrink-0 space-y-2">
        <p className="text-xs text-muted-foreground">{t("questions.hint")}</p>
        <MarkdownEditor
          ref={editorRef}
          value={body}
          onChange={setBody}
          placeholder={t("questions.placeholder")}
          mentions={mentionOptions}
          onSubmit={handleSubmit}
          bordered
        />
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={startNewMeeting}
            disabled={createSessionMutation.isPending}
            className="text-xs text-muted-foreground h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("questions.newMeeting")}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
