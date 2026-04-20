import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function InstanceExperimentalSettings() {
  const { t } = useTranslation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("instanceSettings.title") },
      { label: t("instanceExperimental.title") },
    ]);
  }, [setBreadcrumbs, t]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (patch: { enableIsolatedWorkspaces?: boolean; autoRestartDevServerWhenIdle?: boolean; enableAgentMemory?: boolean; enableAutoSkillCreation?: boolean }) =>
      instanceSettingsApi.updateExperimental(patch),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Failed to update experimental settings.");
    },
  });

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceExperimental.loading")}</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : "Failed to load experimental settings."}
      </div>
    );
  }

  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;
  const enableAgentMemory = experimentalQuery.data?.enableAgentMemory === true;
  const enableAutoSkillCreation = experimentalQuery.data?.enableAutoSkillCreation === true;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("instanceExperimental.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("instanceExperimental.subtitle")}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimental.isolatedWorkspaces")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Show execution workspace controls in project configuration and allow isolated workspace behavior for new
              and existing issue runs.
            </p>
          </div>
          <ToggleSwitch
            checked={enableIsolatedWorkspaces}
            onCheckedChange={() => toggleMutation.mutate({ enableIsolatedWorkspaces: !enableIsolatedWorkspaces })}
            disabled={toggleMutation.isPending}
            aria-label="Toggle isolated workspaces experimental setting"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimental.autoRestartDevServer")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              In `pnpm dev:once`, wait for all queued and running local agent runs to finish, then restart the server
              automatically when backend changes or migrations make the current boot stale.
            </p>
          </div>
          <ToggleSwitch
            checked={autoRestartDevServerWhenIdle}
            onCheckedChange={() => toggleMutation.mutate({ autoRestartDevServerWhenIdle: !autoRestartDevServerWhenIdle })}
            disabled={toggleMutation.isPending}
            aria-label="Toggle guarded dev-server auto-restart"
          />
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimental.agentMemory")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Enable persistent memory for Hermes agents. When active, Hermes will store and recall facts across
              sessions using its built-in memory tooling.
            </p>
          </div>
          <ToggleSwitch
            checked={enableAgentMemory}
            onCheckedChange={() => toggleMutation.mutate({ enableAgentMemory: !enableAgentMemory })}
            disabled={toggleMutation.isPending}
            aria-label="Toggle Hermes agent memory"
          />
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimental.autoSkillCreation")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              When a Hermes agent run succeeds, automatically save any skills it proposes (via{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{"<skill_proposal>"}</code> blocks) as
              company skills so they can be reused by other agents.
            </p>
          </div>
          <ToggleSwitch
            checked={enableAutoSkillCreation}
            onCheckedChange={() => toggleMutation.mutate({ enableAutoSkillCreation: !enableAutoSkillCreation })}
            disabled={toggleMutation.isPending}
            aria-label="Toggle Hermes auto skill creation"
          />
        </div>
      </section>
    </div>
  );
}
