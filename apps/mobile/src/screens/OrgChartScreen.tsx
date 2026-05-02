// @ts-nocheck  — react-native-svg 15.x class types conflict with @types/react 18.3; runtime is correct
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { T } from '../tokens';
import { findAgent, AgentStatus } from '../data';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';

// ─── Local leaf agent data (not in data.ts) ───────────────────
const CEO = {
  id: 'sasha',
  name: 'Sasha Kumar',
  initials: 'SA',
  color: '#4A90E2',
  role: 'CEO · You',
  status: 'active' as AgentStatus,
};

const LEAF_AGENTS: Record<string, { id: string; name: string; initials: string; color: string; role: string; status: AgentStatus }> = {
  otto: { id: 'otto', name: 'Otto', initials: 'OT', color: '#7AB7E8', role: 'Frontend Engineer',  status: 'thinking' },
  kai:  { id: 'kai',  name: 'Kai',  initials: 'KA', color: '#3A6BB5', role: 'Backend Engineer',   status: 'idle'     },
  nyx:  { id: 'nyx',  name: 'Nyx',  initials: 'NX', color: '#A06CD5', role: 'QA Engineer',        status: 'active'   },
  lyra: { id: 'lyra', name: 'Lyra', initials: 'LY', color: '#2BA774', role: 'Onboarding Lead',    status: 'idle'     },
  velo: { id: 'velo', name: 'Velo', initials: 'VE', color: '#34C98A', role: 'Renewals Analyst',   status: 'thinking' },
  finn: { id: 'finn', name: 'Finn', initials: 'FN', color: '#F5A623', role: 'Observability Eng',  status: 'paused'   },
  iris: { id: 'iris', name: 'Iris', initials: 'IR', color: '#E8856A', role: 'On-call Analyst',    status: 'blocked'  },
};

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: 'Active',   color: T.ok     },
  { label: 'Thinking', color: T.accent },
  { label: 'Idle',     color: T.fg3    },
  { label: 'Paused',   color: T.warn   },
  { label: 'Blocked',  color: T.err    },
];

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = SCREEN_W - 32;
const SELECTED_LEAF_ID = 'kai';

export const OrgChartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const allLeaves = {
    ...LEAF_AGENTS,
    juno: findAgent('juno') as any,
    tess: findAgent('tess') as any,
  };

  const ORG_BRANCHES = [
    { head: findAgent('aria'), reports: ['juno', 'otto', 'kai', 'nyx'] },
    { head: findAgent('mira'), reports: ['lyra', 'velo'] },
    { head: findAgent('rex'),  reports: ['tess', 'finn', 'iris'] },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Org Chart"
        subtitle="6 agents · 4 humans · 2 working"
        showBack
        onBack={() => navigation.goBack()}
        right={<Icon name="more" size={20} color={T.fg1} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Icon name="search" size={16} color={T.fg3} />
            <TextInput
              placeholder="Search people…"
              placeholderTextColor={T.fg3}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Legend */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendContent}
          style={styles.legendScroll}
        >
          {LEGEND_ITEMS.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Org tree */}
        <View style={styles.tree}>
          {/* CEO card */}
          <View style={styles.ceoCard}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.avatarCircle, { width: 44, height: 44, borderRadius: 22, backgroundColor: CEO.color }]}>
                <Text style={styles.ceoInitials}>{CEO.initials}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: T.ok }]} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.ceoName}>{CEO.name}</Text>
              <Text style={styles.ceoRole}>{CEO.role}</Text>
            </View>
            <View style={styles.youBadge}>
              <Text style={styles.youText}>YOU</Text>
            </View>
          </View>

          {/* Branches */}
          {ORG_BRANCHES.map((branch, bi) => {
            const leaves = branch.reports.map((id) => allLeaves[id]).filter(Boolean);
            const isLast = bi === ORG_BRANCHES.length - 1;

            return (
              <View key={branch.head.id}>
                {/* Center vertical connector */}
                <View style={styles.centerSpine} />

                {/* Head branch with L-connector */}
                <View style={{ position: 'relative' }}>
                  <Svg
                    width={CONTENT_W}
                    height={14}
                    style={{ position: 'absolute', top: -18, left: 0 }}
                    pointerEvents="none"
                  >
                    <Path
                      d={`M ${CONTENT_W / 2} 0 L ${CONTENT_W / 2} 14`}
                      stroke={T.borderStrong}
                      strokeWidth={1.25}
                      fill="none"
                    />
                  </Svg>

                  <View style={{ marginLeft: 20 }}>
                    {/* Head card */}
                    <View style={styles.headCard}>
                      {/* Accent bar */}
                      <View style={[styles.headAccentBar, { backgroundColor: branch.head.color }]} />
                      <Avatar agent={branch.head} size={40} dot />
                      <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                        <Text style={styles.headName}>{branch.head.name}</Text>
                        <Text style={styles.headRole} numberOfLines={1}>{branch.head.role}</Text>
                        <Text style={styles.headReports}>{`${leaves.length} direct reports`}</Text>
                      </View>
                      <Pill status={branch.head.status} />
                    </View>

                    {/* Leaves */}
                    <View style={styles.leavesContainer}>
                      {/* Vertical spine */}
                      <View style={[styles.leavesSpine, { height: Math.max(0, leaves.length * 60 - 8) }]} />

                      {leaves.map((leaf, li) => {
                        const isSelected = leaf.id === SELECTED_LEAF_ID;
                        return (
                          <View
                            key={leaf.id}
                            style={[
                              styles.leafRow,
                              { marginBottom: li < leaves.length - 1 ? 8 : 0 },
                            ]}
                          >
                            {/* Horizontal arm */}
                            <View style={styles.leafArm} />
                            {/* Leaf card */}
                            <View style={[styles.leafCard, isSelected && styles.leafCardSelected]}>
                              {isSelected && (
                                <View style={[styles.leafAccentBar, { backgroundColor: T.accent }]} />
                              )}
                              <View style={{ paddingLeft: isSelected ? 10 : 12, flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                                <Avatar agent={leaf} size={28} dot />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={styles.leafName}>{leaf.name}</Text>
                                  <Text style={styles.leafRole} numberOfLines={1}>{leaf.role}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Between-branch separator or trailing spacer */}
                {isLast
                  ? <View style={{ height: 24 }} />
                  : <View style={styles.centerSpine} />}
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

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.bg2, borderWidth: 1, borderColor: T.border1,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: T.fg0, fontSize: 14 },

  // Legend
  legendScroll: { marginTop: 8 },
  legendContent: { paddingHorizontal: 16, gap: 14, flexDirection: 'row', alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: T.fg2, fontSize: 12 },

  // Tree container
  tree: { paddingHorizontal: 16, paddingTop: 20 },

  // CEO card
  ceoCard: {
    backgroundColor: T.bg1,
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarCircle: { alignItems: 'center', justifyContent: 'center' },
  ceoInitials: { color: '#fff', fontSize: 15, fontWeight: '600' },
  statusDot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: T.bg1,
    position: 'absolute', right: -1, bottom: -1,
  },
  ceoName: { color: T.fg0, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  ceoRole: { color: T.fg2, fontSize: 13, marginTop: 1 },
  youBadge: {
    backgroundColor: T.accBg,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  youText: { color: T.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },

  // Spine connectors
  centerSpine: { width: 1, height: 18, backgroundColor: T.borderStrong, alignSelf: 'center' },

  // Head card
  headCard: {
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.border1,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  headName: { color: T.fg0, fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  headRole: { color: T.fg2, fontSize: 12, marginTop: 1 },
  headReports: { color: T.fg3, fontSize: 11, marginTop: 2, fontFamily: 'monospace' },

  // Leaves
  leavesContainer: { marginLeft: 28, marginTop: 8, position: 'relative' },
  leavesSpine: { position: 'absolute', left: 0, top: 0, width: 1, backgroundColor: T.border1 },
  leafRow: { paddingLeft: 18, position: 'relative' },
  leafArm: { position: 'absolute', left: 0, top: 26, width: 18, height: 1, backgroundColor: T.border1 },
  leafCard: {
    height: 52,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.border1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leafCardSelected: {
    backgroundColor: T.bg3,
    borderColor: T.borderStrong,
  },
  leafAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  leafName: { color: T.fg0, fontSize: 13, fontWeight: '600' },
  leafRole: { color: T.fg2, fontSize: 11, marginTop: 1 },
});
