import React, { useState, useEffect, useCallback } from "react";
import { RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import {
  YStack,
  XStack,
  H3,
  Text,
  Card,
  Spinner,
  Button,
  Paragraph,
  Circle,
} from "tamagui";
import { api } from "../api/client";
import { useCompany } from "../context/CompanyContext";

type AgentStatus = "active" | "paused" | "error" | "pending";
type AgentRole = "ceo" | "manager" | "worker";

interface Agent {
  id: string;
  name: string;
  urlKey: string;
  role: AgentRole;
  title: string | null;
  icon: string | null;
  status: AgentStatus;
  adapterType: string;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  pauseReason: string | null;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: "#10b981",
  paused: "#f59e0b",
  error: "#ef4444",
  pending: "#6b7280",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Active",
  paused: "Paused",
  error: "Error",
  pending: "Pending",
};

const ROLE_LABELS: Record<AgentRole, string> = {
  ceo: "CEO",
  manager: "Manager",
  worker: "Worker",
};

const ROLE_ICONS: Record<AgentRole, string> = {
  ceo: "👑",
  manager: "🎯",
  worker: "⚙️",
};

function AgentCard({ agent }: { agent: Agent }) {
  const spendPct =
    agent.budgetMonthlyCents > 0
      ? Math.min(
          (agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100,
          100
        )
      : 0;

  return (
    <Card
      backgroundColor="$color3"
      borderColor="$color5"
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      marginBottom="$3"
    >
      <YStack gap="$3">
        {/* Header */}
        <XStack gap="$3" alignItems="center">
          {/* Avatar */}
          <Circle
            size={44}
            backgroundColor="$color5"
            alignItems="center"
            justifyContent="center"
          >
            <Text size="$5">{agent.icon ?? ROLE_ICONS[agent.role]}</Text>
          </Circle>

          {/* Name + role */}
          <YStack flex={1}>
            <Text color="$color12" size="$4" fontWeight="600">
              {agent.name}
            </Text>
            {agent.title && (
              <Text color="$color9" size="$3">
                {agent.title}
              </Text>
            )}
            <XStack gap="$2" marginTop={2}>
              <Text color="$color8" size="$2">
                {ROLE_ICONS[agent.role]} {ROLE_LABELS[agent.role]}
              </Text>
              <Text color="$color7" size="$2">
                · {agent.adapterType}
              </Text>
            </XStack>
          </YStack>

          {/* Status */}
          <XStack
            backgroundColor={`${STATUS_COLORS[agent.status]}22`}
            borderColor={STATUS_COLORS[agent.status]}
            borderWidth={1}
            borderRadius="$10"
            paddingHorizontal="$2"
            paddingVertical={3}
            alignItems="center"
            gap="$1"
          >
            <Circle size={6} backgroundColor={STATUS_COLORS[agent.status]} />
            <Text
              color={STATUS_COLORS[agent.status]}
              size="$1"
              fontWeight="600"
            >
              {STATUS_LABELS[agent.status]}
            </Text>
          </XStack>
        </XStack>

        {/* Budget bar */}
        {agent.budgetMonthlyCents > 0 && (
          <YStack gap="$1">
            <XStack justifyContent="space-between">
              <Text color="$color9" size="$2">
                Monthly spend
              </Text>
              <Text color="$color9" size="$2">
                ${(agent.spentMonthlyCents / 100).toFixed(2)} / $
                {(agent.budgetMonthlyCents / 100).toFixed(2)}
              </Text>
            </XStack>
            <YStack
              height={4}
              backgroundColor="$color5"
              borderRadius="$10"
              overflow="hidden"
            >
              <YStack
                height="100%"
                width={`${spendPct}%`}
                backgroundColor={
                  spendPct > 80 ? "$red9" : spendPct > 60 ? "$orange9" : "$blue9"
                }
                borderRadius="$10"
              />
            </YStack>
          </YStack>
        )}

        {/* Pause reason */}
        {agent.pauseReason && (
          <XStack
            backgroundColor="$yellow3"
            borderColor="$yellow6"
            borderWidth={1}
            borderRadius="$3"
            padding="$2"
            gap="$2"
          >
            <Text color="$yellow10" size="$2">
              ⚠️ {agent.pauseReason}
            </Text>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

export function AgentsScreen() {
  const { activeCompany } = useCompany();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Agent[]>(
        `/api/companies/${activeCompany.id}/agents`
      );
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Group agents by role
  const grouped = {
    ceo: agents.filter((a) => a.role === "ceo"),
    manager: agents.filter((a) => a.role === "manager"),
    worker: agents.filter((a) => a.role === "worker"),
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0b0d" }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#888"
        />
      }
    >
      <YStack gap="$4">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <H3 color="$color12">Agents</H3>
          <Text color="$color9" size="$3">
            {agents.length} total
          </Text>
        </XStack>

        {loading && !agents.length && (
          <YStack alignItems="center" padding="$8">
            <Spinner size="large" color="$blue9" />
          </YStack>
        )}

        {error && (
          <YStack
            backgroundColor="$red3"
            borderColor="$red6"
            borderWidth={1}
            borderRadius="$3"
            padding="$4"
            gap="$2"
          >
            <Text color="$red10" size="$3">
              {error}
            </Text>
            <Button size="$3" onPress={load} variant="outlined">
              Retry
            </Button>
          </YStack>
        )}

        {!loading && agents.length === 0 && !error && (
          <YStack alignItems="center" padding="$8" gap="$2">
            <Text color="$color9" size="$6">
              🤖
            </Text>
            <Text color="$color9" size="$3">
              No agents configured
            </Text>
          </YStack>
        )}

        {/* CEO */}
        {grouped.ceo.length > 0 && (
          <YStack gap="$2">
            <Text color="$color10" size="$3" fontWeight="600">
              👑 Leadership
            </Text>
            {grouped.ceo.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </YStack>
        )}

        {/* Managers */}
        {grouped.manager.length > 0 && (
          <YStack gap="$2">
            <Text color="$color10" size="$3" fontWeight="600">
              🎯 Managers
            </Text>
            {grouped.manager.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </YStack>
        )}

        {/* Workers */}
        {grouped.worker.length > 0 && (
          <YStack gap="$2">
            <Text color="$color10" size="$3" fontWeight="600">
              ⚙️ Workers
            </Text>
            {grouped.worker.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
