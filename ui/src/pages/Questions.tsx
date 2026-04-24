import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { queryKeys } from "../lib/queryKeys";
import { buildMarkdownMentionOptions } from "../lib/company-members";
import { EmptyState } from "../components/EmptyState";
import { MarkdownEditor, type MarkdownEditorRef } from "../components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { timeAgo } from "../lib/timeAgo";
import type { Issue } from "@paperclipai/shared";

const MEETING_LABEL_NAME = "meeting";
const MEETING_LABEL_COLOR = "#0ea5e9";

function MeetingCard({ issue }: { issue: Issue }) {
  return (
    <Link
      to={`/issues/${issue.id}`}
      className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors group"
    >
      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{issue.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {issue.identifier} · {timeAgo(issue.createdAt)}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export function Questions() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [body, setBody] = useState("");
  const editorRef = useRef<MarkdownEditorRef>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: t("questions.title") }]);
  }, [setBreadcrumbs, t]);

  const { data: labels } = useQuery({
    queryKey: queryKeys.issues.labels(selectedCompanyId!),
    queryFn: () => issuesApi.listLabels(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

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

  const meetingLabel = labels?.find((l) => l.name === MEETING_LABEL_NAME);

  const { data: meetings, isLoading } = useQuery({
    queryKey: [
      ...queryKeys.issues.list(selectedCompanyId!),
      "meeting-label",
      meetingLabel?.id ?? null,
    ],
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, { labelId: meetingLabel!.id, limit: 30 }),
    enabled: !!selectedCompanyId && !!meetingLabel?.id,
  });

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

  const createMeetingMutation = useMutation({
    mutationFn: (payload: { title: string; labelId: string }) =>
      issuesApi.create(selectedCompanyId!, {
        title: payload.title,
        labelIds: [payload.labelId],
        status: "todo",
      }),
    onSuccess: (issue) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
      navigate(`/issues/${issue.id}`);
      setBody("");
    },
  });

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || createMeetingMutation.isPending || createLabelMutation.isPending) return;

    let labelId = meetingLabel?.id;
    if (!labelId) {
      const newLabel = await createLabelMutation.mutateAsync();
      labelId = newLabel.id;
    }
    await createMeetingMutation.mutateAsync({ title: trimmed, labelId });
  }

  if (!selectedCompanyId) {
    return <EmptyState icon={MessageSquare} message={t("questions.selectCompany")} />;
  }

  const isEmpty = !isLoading && (!meetings || meetings.length === 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Past meeting threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isEmpty && !meetingLabel && (
          <EmptyState icon={MessageSquare} message={t("questions.noQuestionsYet")} />
        )}
        {isEmpty && meetingLabel && (
          <EmptyState icon={MessageSquare} message={t("questions.noQuestionsYet")} />
        )}
        {meetings?.map((issue) => (
          <MeetingCard key={issue.id} issue={issue} />
        ))}
      </div>

      {/* New meeting composer */}
      <div className="border-t border-border p-4 shrink-0">
        <p className="text-xs text-muted-foreground mb-2">{t("questions.hint")}</p>
        <MarkdownEditor
          ref={editorRef}
          value={body}
          onChange={setBody}
          placeholder={t("questions.placeholder")}
          mentions={mentionOptions}
          onSubmit={handleSubmit}
          bordered
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              !body.trim() ||
              createMeetingMutation.isPending ||
              createLabelMutation.isPending
            }
          >
            {createMeetingMutation.isPending ? t("common.loading") : t("questions.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}
