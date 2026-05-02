import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Agent, AgentStatus } from '../data';
import { T } from '../tokens';

const STATUS_DOT: Record<AgentStatus, string> = {
  active: T.ok,
  thinking: T.accent,
  idle: T.accent,
  paused: T.fg3,
  blocked: T.warn,
  error: T.err,
};

interface AvatarProps {
  agent: Pick<Agent, 'initials' | 'color'> & { status?: AgentStatus };
  size?: number;
  dot?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ agent, size = 32, dot }) => {
  const fontSize = Math.round(size * 0.34);
  const dotSize = Math.max(8, size * 0.26);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={[styles.circle, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: agent.color,
      }]}>
        <Text style={[styles.initials, { fontSize }]}>{agent.initials}</Text>
      </View>
      {dot && agent.status && (
        <View style={[styles.dot, {
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          backgroundColor: STATUS_DOT[agent.status] ?? T.fg3,
          right: -1, bottom: -1,
        }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: T.bg2,
  },
});
