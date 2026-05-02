import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, RefreshControl, Alert } from "react-native";
import {
  YStack,
  XStack,
  H3,
  H4,
  Text,
  Card,
  Spinner,
  Button,
  Separator,
  Paragraph,
} from "tamagui";
import { api } from "../api/client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation";

type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done"
  | "cancelled";
type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";

interface IssueDetail {
  id: string;
  identifier: string | null;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  executionState?: {
    status: string;
    stage: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  assigneeAgent?: {
    id: string;
    name: string;
    icon: string | null;
    title: string | null;
  } | null;
}

const STATUS_COLORS: Record<IssueStatus, string> = {
  backlog: "#6b7280",
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  review: "#8b5cf6",
  done: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

interface IssueDetailScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "IssueDetail">;
  route: RouteProp<RootStackParamList, "IssueDetail">;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <XStack gap="$3" alignItems="flex-start">
      <Text
        color="$color9"
        size="$3"
        fontWeight="600"
        width={100}
        flexShrink={0}
      >
        {label}
      </Text>
      <YStack flex={1}>{typeof value === "string" ? <Text color="$color12" size="$3">{value}</Text> : value}</YStack>
    </XStack>
  );
}

export function IssueDetailScreen({
  navigation,
  route,
}: IssueDetailScreenProps) {
  const { issueId } = route.params;
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<IssueDetail>(`/api/issues/${issueId}`);
      setIssue(data);
      if (data.identifier || data.title) {
        navigation.setOptions({
          title: data.identifier ?? "Issue",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load issue"
      );
    } finally {
      setLoading(false);
    }
  }, [issueId, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!issue) return;
    try {
      await api.patch(`/api/issues/${issueId}`, { status: newStatus });
      setIssue((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  const statusOptions: IssueStatus[] = [
    "backlog",
    "todo",
    "in_progress",
    "review",
    "done",
    "cancelled",
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      {loading && (
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

      {issue && (
        <YStack gap="$4">
          {/* Header */}
          <YStack gap="$2">
            <XStack gap="$2" alignItems="center">
              {issue.identifier && (
                <Text color="$color8" size="$3" fontFamily="$mono">
                  {issue.identifier}
                </Text>
              )}
              <XStack
                backgroundColor={`${STATUS_COLORS[issue.status]}22`}
                borderColor={STATUS_COLORS[issue.status]}
                borderWidth={1}
                borderRadius="$10"
                paddingHorizontal="$3"
                paddingVertical={3}
              >
                <Text
                  color={STATUS_COLORS[issue.status]}
                  size="$2"
                  fontWeight="600"
                >
                  {STATUS_LABELS[issue.status]}
                </Text>
              </XStack>
            </XStack>

            <H3 color="$color12">{issue.title}</H3>
          </YStack>

          {/* Description */}
          {issue.description && (
            <Card
              backgroundColor="$color3"
              borderColor="$color5"
              borderWidth={1}
              borderRadius="$4"
              padding="$4"
            >
              <YStack gap="$2">
                <Text color="$color10" size="$3" fontWeight="600">
                  Description
                </Text>
                <Paragraph color="$color12" size="$3">
                  {issue.description}
                </Paragraph>
              </YStack>
            </Card>
          )}

          {/* Details */}
          <Card
            backgroundColor="$color3"
            borderColor="$color5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <YStack gap="$3">
              <H4 color="$color11">Details</H4>
              <Separator borderColor="$color5" />
              <InfoRow label="Priority" value={PRIORITY_LABELS[issue.priority]} />
              <InfoRow
                label="Assignee"
                value={
                  issue.assigneeAgent ? (
                    <Text color="$color12" size="$3">
                      {issue.assigneeAgent.icon && `${issue.assigneeAgent.icon} `}
                      {issue.assigneeAgent.name}
                      {issue.assigneeAgent.title && ` — ${issue.assigneeAgent.title}`}
                    </Text>
                  ) : (
                    <Text color="$color8" size="$3">Unassigned</Text>
                  )
                }
              />
              <InfoRow label="Created" value={formatDate(issue.createdAt)} />
              <InfoRow label="Updated" value={formatDate(issue.updatedAt)} />
              {issue.executionState && (
                <InfoRow
                  label="Stage"
                  value={issue.executionState.stage ?? issue.executionState.status}
                />
              )}
            </YStack>
          </Card>

          {/* Change Status */}
          <Card
            backgroundColor="$color3"
            borderColor="$color5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <YStack gap="$3">
              <H4 color="$color11">Change Status</H4>
              <Separator borderColor="$color5" />
              <XStack gap="$2" flexWrap="wrap">
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    size="$3"
                    onPress={() => handleStatusChange(status)}
                    backgroundColor={
                      issue.status === status
                        ? `${STATUS_COLORS[status]}33`
                        : "$color2"
                    }
                    borderColor={
                      issue.status === status
                        ? STATUS_COLORS[status]
                        : "$color5"
                    }
                    borderWidth={1}
                    color={
                      issue.status === status
                        ? STATUS_COLORS[status]
                        : "$color11"
                    }
                    fontWeight={issue.status === status ? "700" : "400"}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </XStack>
            </YStack>
          </Card>
        </YStack>
      )}
    </ScrollView>
  );
}
