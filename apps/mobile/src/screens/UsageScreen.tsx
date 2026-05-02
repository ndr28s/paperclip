// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../tokens';
import { Progress } from '../components/Progress';
import { PageHeader } from '../components/PageHeader';
import { useCompanyData } from '../hooks/useApi';

const PERIODS = ['7d', '30d', '90d'] as const;
type Period = typeof PERIODS[number];

interface RawCostByAgent {
  agentId: string;
  agentName: string;
  agentStatus: string;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  subscriptionRunCount: number;
}

interface RawCostSummary {
  companyId: string;
  spendCents: number;
  budgetCents: number;
  utilizationPercent: number;
}

const AGENT_COLORS = ['#4A90E2','#7AB7E8','#A06CD5','#34C98A','#E8856A','#3A6BB5','#F5A623','#C078E0','#2BA774','#5BA0E8','#E8524A','#D08F3F'];
function agentColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function dateRange(days: number): string {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `?from=${fmt(from)}&to=${fmt(to)}`;
}

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

export const UsageScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [period, setPeriod] = useState<Period>('30d');

  const days = PERIOD_DAYS[period];
  const range = useMemo(() => dateRange(days), [days]);

  const costByAgentPath = useMemo(() => `/costs/by-agent${range}`, [range]);
  const costSummaryPath = useMemo(() => `/costs/summary${range}`, [range]);

  const { data: costByAgent } = useCompanyData<RawCostByAgent[]>(costByAgentPath);
  const { data: costSummary } = useCompanyData<RawCostSummary>(costSummaryPath);
  const { data: dashboard } = useCompanyData<any>('/dashboard');
  const { data: agentsData } = useCompanyData<any[]>('/agents');
  const { data: projectsData } = useCompanyData<any[]>('/projects');

  const rows = useMemo(() => {
    if (!costByAgent) return [];
    return [...costByAgent]
      .map((row) => {
        const totalTokens = row.inputTokens + row.outputTokens + row.cachedInputTokens;
        return { ...row, totalTokens };
      })
      .sort((a, b) => b.totalTokens - a.totalTokens);
  }, [costByAgent]);

  const maxTokens = rows.length > 0 ? rows[0].totalTokens : 1;

  const totalTokens = useMemo(
    () => rows.reduce((sum, r) => sum + r.totalTokens, 0),
    [rows],
  );

  const spendCents = costSummary?.spendCents ?? 0;
  const budgetCents = costSummary?.budgetCents ?? 0;
  const utilizationPercent = costSummary?.utilizationPercent ?? 0;
  const totalProjects = projectsData?.length ?? 0;

  const summary = [
    {
      value: String(dashboard?.tasks?.done ?? 0),
      label: 'Tasks completed',
      sub: `across ${totalProjects} projects`,
      accent: false,
      progress: undefined as number | undefined,
    },
    {
      value: totalTokens.toLocaleString(),
      label: 'Total tokens',
      sub: 'input + output + cached',
      accent: false,
      progress: undefined,
    },
    {
      value: String(agentsData?.length ?? 0),
      label: 'Agents',
      sub: 'configured in workspace',
      accent: false,
      progress: undefined,
    },
    {
      value: `$${(spendCents / 100).toFixed(2)}`,
      label: 'Spend MTD',
      sub: `of $${(budgetCents / 100).toFixed(2)} cap`,
      accent: true,
      progress: utilizationPercent / 100,
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Usage & Costs" showBack onBack={() => navigation.goBack()} />

      {/* Period toggle */}
      <View style={styles.periodBar}>
        {PERIODS.map((p) => {
          const active = p === period;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodTab, active && styles.periodTabActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Summary 2x2 grid */}
        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={[styles.summaryValue, item.accent && { color: T.accent }]}>
                {item.value}
              </Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summarySub}>{item.sub}</Text>
              {item.progress !== undefined && (
                <View style={{ marginTop: 10 }}>
                  <Progress value={item.progress} color={T.accent} height={4} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Agent breakdown</Text>
          <Text style={styles.sectionRight}>sorted by tokens</Text>
        </View>

        {/* Agent list */}
        <View style={styles.agentCard}>
          {rows.map((row, ri) => {
            const agentRecord = agentsData?.find((a: any) => a.id === row.agentId || a.agentId === row.agentId);
            const name = agentRecord?.name ?? row.agentName ?? row.agentId;
            const role = agentRecord?.role ?? '';
            const initials = name.slice(0, 2).toUpperCase();
            const color = agentColor(row.agentId);
            const isLast = ri === rows.length - 1;
            const share = maxTokens > 0 ? row.totalTokens / maxTokens : 0;
            const tokensDisplay = row.totalTokens > 0 ? row.totalTokens.toLocaleString() : '—';
            const costDisplay = `$${(row.costCents / 100).toFixed(2)}`;

            return (
              <View
                key={row.agentId}
                style={[
                  styles.agentRow,
                  !isLast && styles.agentRowBorder,
                ]}
              >
                {/* Avatar circle */}
                <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>

                <View style={styles.agentInfo}>
                  {/* Top row */}
                  <View style={styles.agentTopRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.agentName}>{name}</Text>
                      {role ? (
                        <Text style={styles.agentRole} numberOfLines={1}>{role}</Text>
                      ) : null}
                    </View>
                    <View style={styles.agentStats}>
                      <Text style={styles.agentTokens}>{tokensDisplay}</Text>
                      <Text style={styles.agentCost}>{costDisplay}</Text>
                    </View>
                  </View>
                  {/* Progress bar */}
                  <View style={{ marginTop: 8 }}>
                    <Progress value={share} color={color} height={3} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg0 },

  // Period toggle
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border1,
  },
  periodTab: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  periodTabActive: {
    borderBottomColor: T.accent,
  },
  periodText: {
    color: T.fg3,
    fontSize: 13,
    fontWeight: '500',
  },
  periodTextActive: {
    color: T.fg0,
    fontWeight: '600',
  },

  // Summary grid
  summaryGrid: {
    padding: 14,
    paddingBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '47.5%',
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.border1,
    borderRadius: 14,
    padding: 14,
  },
  summaryValue: {
    color: T.fg0,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summaryLabel: {
    color: T.fg2,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  summarySub: {
    color: T.fg3,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: T.fg0,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionRight: {
    color: T.fg3,
    fontSize: 12,
  },

  // Agent list
  agentCard: {
    marginHorizontal: 16,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.border1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
  },
  agentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.border1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  agentInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  agentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  agentName: {
    color: T.fg0,
    fontSize: 14,
    fontWeight: '600',
  },
  agentRole: {
    color: T.fg2,
    fontSize: 12,
    marginTop: 1,
  },
  agentStats: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  agentTokens: {
    color: T.fg0,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  agentCost: {
    color: T.fg3,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 1,
  },
});
