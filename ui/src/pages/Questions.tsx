import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, ArrowUpRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Issue } from "@paperclipai/shared";

const QUESTION_LABEL_NAME = "question";
const QUESTION_LABEL_COLOR = "#6366f1";

const STATUS_CLASSES: Record<string, string> = {
  backlog: "text-muted-foreground",
  todo: "text-blue-500",
  in_progress: "text-yellow-500",
  in_review: "text-purple-500",
  done: "text-green-500",
  blocked: "text-red-500",
  cancelled: "text-muted-foreground",
};

function QuestionBubble({ issue }: { issue: Issue }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 max-w-2xl">
      <div className="bg-accent/50 rounded-lg px-4 py-3 text-sm">{issue.title}</div>
      <div className="flex items-center gap-2 pl-1">
        <span className={cn("text-xs", STATUS_CLASSES[issue.status] ?? "text-muted-foreground")}>
          {t(`status.${issue.status}`, { defaultValue: issue.status })}
        </span>
        <span className="text-xs text-muted-foreground">·</span>
        <Link
          to={`/issues/${issue.id}`}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          {issue.identifier}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function Questions() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { openNewIssue } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: t("questions.title") }]);
  }, [setBreadcrumbs, t]);

  const { data: labels } = useQuery({
    queryKey: queryKeys.issues.labels(selectedCompanyId!),
    queryFn: () => issuesApi.listLabels(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const questionLabel = labels?.find((l) => l.name === QUESTION_LABEL_NAME);

  const { data: questions, isLoading } = useQuery({
    queryKey: [
      ...queryKeys.issues.list(selectedCompanyId!),
      "question-label",
      questionLabel?.id ?? null,
    ],
    queryFn: () => issuesApi.list(selectedCompanyId!, { labelId: questionLabel!.id, limit: 50 }),
    enabled: !!selectedCompanyId && !!questionLabel?.id,
  });

  const createLabelMutation = useMutation({
    mutationFn: () =>
      issuesApi.createLabel(selectedCompanyId!, {
        name: QUESTION_LABEL_NAME,
        color: QUESTION_LABEL_COLOR,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.labels(selectedCompanyId!) });
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: (payload: { title: string; labelId: string }) =>
      issuesApi.create(selectedCompanyId!, {
        title: payload.title,
        labelIds: [payload.labelId],
        status: "todo",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
      setText("");
    },
  });

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("/issue")) {
      const issueText = trimmed.slice(6).trim();
      openNewIssue({ title: issueText });
      setText("");
      return;
    }

    let labelId = questionLabel?.id;
    if (!labelId) {
      const newLabel = await createLabelMutation.mutateAsync();
      labelId = newLabel.id;
    }

    await createIssueMutation.mutateAsync({ title: trimmed, labelId });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  if (!selectedCompanyId) {
    return <EmptyState icon={MessageSquare} message={t("questions.selectCompany")} />;
  }

  const isEmpty = !isLoading && (!questions || questions.length === 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isEmpty && <EmptyState icon={MessageSquare} message={t("questions.noQuestionsYet")} />}
        {questions?.map((issue) => (
          <QuestionBubble key={issue.id} issue={issue} />
        ))}
      </div>

      <div className="border-t border-border p-4 shrink-0">
        <p className="text-xs text-muted-foreground mb-2">{t("questions.hint")}</p>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("questions.placeholder")}
            rows={2}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              !text.trim() ||
              createIssueMutation.isPending ||
              createLabelMutation.isPending
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
