import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  YStack,
  XStack,
  H3,
  Text,
  Card,
  Spinner,
  Input,
  Button,
} from "tamagui";
import { api } from "../api/client";
import { useCompany } from "../context/CompanyContext";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";

type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done"
  | "cancelled";
type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";

interface Issue {
  id: string;
  identifier: string | null;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
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

const PRIORITY_ICONS: Record<IssuePriority, string> = {
  none: "○",
  low: "▽",
  medium: "◇",
  high: "▲",
  urgent: "⚡",
};

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  none: "#6b7280",
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

interface IssuesScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Issues">;
}

export function IssuesScreen({ navigation }: IssuesScreenProps) {
  const { activeCompany } = useCompany();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all");

  const load = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Issue[]>(
        `/api/companies/${activeCompany.id}/issues`
      );
      setIssues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issues");
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

  const filtered = issues.filter((issue) => {
    const matchSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      (issue.identifier?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus =
      filterStatus === "all" || issue.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusFilters: Array<IssueStatus | "all"> = [
    "all",
    "in_progress",
    "todo",
    "backlog",
    "review",
    "done",
  ];

  return (
    <YStack flex={1} backgroundColor="#0b0b0d">
      {/* Search + Filters */}
      <YStack paddingHorizontal="$4" paddingTop="$3" gap="$2">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search issues…"
          backgroundColor="$color3"
          borderColor="$color5"
          color="$color12"
          placeholderTextColor="#666"
          size="$4"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {statusFilters.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor:
                  filterStatus === status ? "#3b82f6" : "#1a1a1f",
                borderWidth: 1,
                borderColor: filterStatus === status ? "#3b82f6" : "#333",
              }}
            >
              <Text
                color={filterStatus === status ? "white" : "$color10"}
                size="$2"
                fontWeight="600"
              >
                {status === "all"
                  ? "All"
                  : STATUS_LABELS[status as IssueStatus]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </YStack>

      {/* Count */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text color="$color9" size="$3">
          {filtered.length} issue{filtered.length !== 1 ? "s" : ""}
        </Text>
        {loading && <Spinner size="small" color="$blue9" />}
      </XStack>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#888"
          />
        }
      >
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

        {!loading && filtered.length === 0 && !error && (
          <YStack alignItems="center" padding="$8" gap="$2">
            <Text color="$color9" size="$6">
              📋
            </Text>
            <Text color="$color9" size="$3">
              {search || filterStatus !== "all"
                ? "No issues match your filters"
                : "No issues yet"}
            </Text>
          </YStack>
        )}

        {filtered.map((issue) => (
          <TouchableOpacity
            key={issue.id}
            onPress={() =>
              navigation.navigate("IssueDetail", { issueId: issue.id })
            }
            activeOpacity={0.7}
          >
            <Card
              backgroundColor="$color3"
              borderColor="$color5"
              borderWidth={1}
              borderRadius="$4"
              padding="$4"
              marginBottom="$2"
            >
              <YStack gap="$2">
                <XStack gap="$2" alignItems="center">
                  {/* Priority icon */}
                  <Text
                    color={PRIORITY_COLORS[issue.priority]}
                    size="$4"
                    fontWeight="700"
                  >
                    {PRIORITY_ICONS[issue.priority]}
                  </Text>

                  {/* Status badge */}
                  <XStack
                    backgroundColor={`${STATUS_COLORS[issue.status]}22`}
                    borderColor={STATUS_COLORS[issue.status]}
                    borderWidth={1}
                    borderRadius="$10"
                    paddingHorizontal="$2"
                    paddingVertical={2}
                  >
                    <Text
                      color={STATUS_COLORS[issue.status]}
                      size="$1"
                      fontWeight="600"
                    >
                      {STATUS_LABELS[issue.status]}
                    </Text>
                  </XStack>

                  {/* Identifier */}
                  {issue.identifier && (
                    <Text color="$color8" size="$2">
                      {issue.identifier}
                    </Text>
                  )}
                </XStack>

                <Text color="$color12" size="$4" fontWeight="500">
                  {issue.title}
                </Text>
              </YStack>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </YStack>
  );
}
