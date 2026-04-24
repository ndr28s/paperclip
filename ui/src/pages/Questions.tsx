import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { buildMarkdownMentionOptions } from "../lib/company-members";
import { EmptyState } from "../components/EmptyState";
import { MarkdownEditor, type MarkdownEditorRef } from "../components/MarkdownEditor";
import { MarkdownBody } from "../components/MarkdownBody";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseAgentMentionHref } from "@paperclipai/shared";
import type { IssueComment } from "@paperclipai/shared";
import type { Agent } from "@paperclipai/shared";

const MEETING_LABEL_NAME = "meeting";
const MEETING_LABEL_COLOR = "#0ea5e9";

function meetingStorageKey(companyId: string) {
  return `paperclip:meeting-issue:${companyId}`;
}

function extractMentionedAgentId(markdown: string): string | null {
  const matches = [...markdown.matchAll(/\(([^)]+)\)/g)];
  for (const match of matches) {
    const parsed = parseAgentMentionHref(match[1]);
    if (parsed?.agentId) return parsed.agentId;
  }
  return null;
}

function ChatBubble({
  comment,
  agentMap,
}: {
  comment: IssueComment;
  agentMap: Map<string, Agent>;
}) {
  const isUser = !!comment.authorUserId && !comment.authorAgentId;
  const agent = comment.authorAgentId ? agentMap.get(comment.authorAgentId) : null;

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
        {agent && (
          <p className="text-[11px] font-semibold mb-1 opacity-60">{agent.name}</p>
        )}
        <MarkdownBody className="prose-sm">{comment.body}</MarkdownBody>
      </div>
    </div>
  );
}

export function Questions() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [body, setBody] = useState("");
  const [meetingIssueId, setMeetingIssueId] = useState<string | null>(() => {
    if (!selectedCompanyId) return null;
    return localStorage.getItem(meetingStorageKey(selectedCompanyId));
  });
  const editorRef = useRef<MarkdownEditorRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: t("questions.title") }]);
  }, [setBreadcrumbs, t]);

  // Persist meetingIssueId
  useEffect(() => {
    if (!selectedCompanyId) return;
    if (meetingIssueId) {
      localStorage.setItem(meetingStorageKey(selectedCompanyId), meetingIssueId);
    } else {
      localStorage.removeItem(meetingStorageKey(selectedCompanyId));
    }
  }, [meetingIssueId, selectedCompanyId]);

  // Labels
  const { data: labels } = useQuery({
    queryKey: queryKeys.issues.labels(selectedCompanyId!),
    queryFn: () => issuesApi.listLabels(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const meetingLabel = labels?.find((l) => l.name === MEETING_LABEL_NAME);

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

  // Current meeting issue
  const { data: meetingIssue } = useQuery({
    queryKey: queryKeys.issues.detail(meetingIssueId ?? ""),
    queryFn: () => issuesApi.get(meetingIssueId!),
    enabled: !!meetingIssueId,
  });

  useEffect(() => {
    if (meetingIssue?.status === "done" || meetingIssue?.status === "cancelled") {
      setMeetingIssueId(null);
    }
  }, [meetingIssue?.status]);

  // Comments (poll every 3s)
  const { data: comments } = useQuery({
    queryKey: queryKeys.issues.comments(meetingIssueId ?? ""),
    queryFn: () => issuesApi.listComments(meetingIssueId!, { order: "asc" }),
    enabled: !!meetingIssueId,
    refetchInterval: 3000,
  });

  // Active run on meeting issue
  const { data: activeRun } = useQuery({
    queryKey: queryKeys.issues.activeRun(meetingIssueId ?? ""),
    queryFn: () => heartbeatsApi.activeRunForIssue(meetingIssueId!),
    enabled: !!meetingIssueId,
    refetchInterval: 3000,
  });

  // All live runs (to detect agent busy elsewhere)
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const assignedAgentId = meetingIssue?.assigneeAgentId ?? ceoAgent?.id;
  const busyRun = useMemo(() => {
    if (!assignedAgentId || !liveRuns) return null;
    return (
      liveRuns.find((r) => r.agentId === assignedAgentId && r.issueId !== meetingIssueId) ?? null
    );
  }, [assignedAgentId, liveRuns, meetingIssueId]);

  const { data: busyIssue } = useQuery({
    queryKey: queryKeys.issues.detail(busyRun?.issueId ?? ""),
    queryFn: () => issuesApi.get(busyRun!.issueId!),
    enabled: !!busyRun?.issueId,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  // Mutations
  const createLabelMutation = useMutation({
    mutationFn: () =>
      issuesApi.createLabel(selectedCompanyId!, {
        name: MEETING_LABEL_NAME,
        color: MEETING_LABEL_COLOR,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.labels(selectedCompanyId!) });
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: (payload: { labelId: string; assigneeAgentId?: string }) =>
      issuesApi.create(selectedCompanyId!, {
        title: "회의",
        labelIds: [payload.labelId],
        status: "in_progress",
        ...(payload.assigneeAgentId ? { assigneeAgentId: payload.assigneeAgentId } : {}),
      }),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ issueId, text }: { issueId: string; text: string }) =>
      issuesApi.addComment(issueId, text, true),
    onSuccess: (_, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.comments(issueId) });
      setBody("");
    },
  });

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    const mentionedAgentId = extractMentionedAgentId(trimmed);
    const targetAgentId = mentionedAgentId ?? ceoAgent?.id;

    let issueId = meetingIssueId;

    if (!issueId) {
      let labelId = meetingLabel?.id;
      if (!labelId) {
        const newLabel = await createLabelMutation.mutateAsync();
        labelId = newLabel.id;
      }
      const issue = await createIssueMutation.mutateAsync({
        labelId,
        assigneeAgentId: targetAgentId,
      });
      issueId = issue.id;
      setMeetingIssueId(issue.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    }

    await addCommentMutation.mutateAsync({ issueId, text: trimmed });
  }

  function startNewMeeting() {
    setMeetingIssueId(null);
  }

  if (!selectedCompanyId) {
    return <EmptyState icon={MessageSquare} message={t("questions.selectCompany")} />;
  }

  const isResponding = !!activeRun;
  const isBusyElsewhere = !isResponding && !!busyRun;
  const displayAgentName =
    (assignedAgentId ? agentMap.get(assignedAgentId)?.name : null) ?? ceoAgent?.name ?? "CEO";
  const isPending =
    addCommentMutation.isPending ||
    createIssueMutation.isPending ||
    createLabelMutation.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Status bar */}
      {(isResponding || isBusyElsewhere) && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/40 text-xs text-muted-foreground shrink-0">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>
            {isResponding
              ? `${displayAgentName} 응답 중...`
              : `${displayAgentName} 업무중${busyIssue ? ` (${busyIssue.identifier})` : ""}`}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!meetingIssueId && (
          <EmptyState icon={MessageSquare} message={t("questions.noQuestionsYet")} />
        )}
        {comments?.map((comment) => (
          <ChatBubble key={comment.id} comment={comment} agentMap={agentMap} />
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
