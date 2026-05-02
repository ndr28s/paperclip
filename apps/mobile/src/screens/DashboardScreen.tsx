import React, { useState, useEffect, useCallback } from "react";
import { RefreshControl, ScrollView } from "react-native";
import {
  YStack,
  XStack,
  H3,
  H4,
  Text,
  Card,
  Spinner,
  Paragraph,
  Button,
} from "tamagui";
import { api } from "../api/client";
import { useCompany } from "../context/CompanyContext";
import { useAuth } from "../context/AuthContext";

interface DashboardSummary {
  agents: { active: number; running: number; paused: number; error: number };
  tasks: { open: number; inProgress: number; blocked: number; done: number };
  costs: {
    monthSpendCents: number;
    monthBudgetCents: number;
    monthUtilizationPercent: number;
  };
  pendingApprovals: number;
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <Card
      backgroundColor="#16161a"
      borderColor="#2a2a35"
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      flex={1}
      minWidth={140}
    >
      <YStack gap="$1">
        <Text color="$color9" size="$2" fontWeight="600" textTransform="uppercase">
          {label}
        </Text>
        <Text
          color={color ?? "$color12"}
          size="$8"
          fontWeight="700"
          lineHeight={40}
        >
          {value}
        </Text>
        {sub && (
          <Text color="$color9" size="$2">
            {sub}
          </Text>
        )}
      </YStack>
    </Card>
  );
}

export function DashboardScreen() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardSummary>(
        `/api/companies/${activeCompany.id}/dashboard`
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0b0d" }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#888" />
      }
    >
      <YStack gap="$4">
        {/* Header */}
        <YStack gap="$1">
          <H3 color="$color12">Dashboard</H3>
          {user && (
            <Paragraph color="$color9" size="$3">
              Welcome back, {user.name ?? user.email ?? "User"}
            </Paragraph>
          )}
          {activeCompany && (
            <Paragraph color="$color10" size="$3">
              {activeCompany.name}
            </Paragraph>
          )}
        </YStack>

        {/* Loading / Error */}
        {loading && !summary && (
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
            <Button size="$3" onPress={load} variant="outlined" borderColor="$red6">
              Retry
            </Button>
          </YStack>
        )}

        {summary && (
          <>
            {/* Agents */}
            <YStack gap="$3">
              <H4 color="$color11">Agents</H4>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard label="Active" value={summary.agents.active} color="$green10" />
                <StatCard label="Running" value={summary.agents.running} color="$blue10" />
                <StatCard label="Paused" value={summary.agents.paused} color="$yellow10" />
                <StatCard label="Error" value={summary.agents.error} color="$red10" />
              </XStack>
            </YStack>

            {/* Tasks */}
            <YStack gap="$3">
              <H4 color="$color11">Tasks</H4>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard label="Open" value={summary.tasks.open} />
                <StatCard
                  label="In Progress"
                  value={summary.tasks.inProgress}
                  color="$blue10"
                />
                <StatCard
                  label="Blocked"
                  value={summary.tasks.blocked}
                  color="$red10"
                />
                <StatCard
                  label="Done"
                  value={summary.tasks.done}
                  color="$green10"
                />
              </XStack>
            </YStack>

            {/* Costs */}
            <YStack gap="$3">
              <H4 color="$color11">Monthly Costs</H4>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard
                  label="Spent"
                  value={formatCents(summary.costs.monthSpendCents)}
                  color="$orange10"
                />
                <StatCard
                  label="Budget"
                  value={formatCents(summary.costs.monthBudgetCents)}
                />
                <StatCard
                  label="Usage"
                  value={`${Math.round(summary.costs.monthUtilizationPercent)}%`}
                  color={
                    summary.costs.monthUtilizationPercent > 80
                      ? "$red10"
                      : "$color12"
                  }
                />
              </XStack>
            </YStack>

            {/* Pending Approvals */}
            {summary.pendingApprovals > 0 && (
              <Card
                backgroundColor="$orange3"
                borderColor="$orange6"
                borderWidth={1}
                borderRadius="$4"
                padding="$4"
              >
                <XStack gap="$3" alignItems="center">
                  <Text color="$orange10" size="$6">
                    ⚠️
                  </Text>
                  <YStack flex={1}>
                    <Text color="$orange10" fontWeight="600" size="$4">
                      {summary.pendingApprovals} Pending Approval
                      {summary.pendingApprovals > 1 ? "s" : ""}
                    </Text>
                    <Text color="$orange8" size="$3">
                      Review required actions in the Approvals tab
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            )}
          </>
        )}
      </YStack>
    </ScrollView>
  );
}
