import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "tamagui";
import { useAuth } from "../context/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { IssuesScreen } from "../screens/IssuesScreen";
import { IssueDetailScreen } from "../screens/IssueDetailScreen";
import { AgentsScreen } from "../screens/AgentsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ActivityIndicator, View } from "react-native";

export type RootStackParamList = {
  Main: undefined;
  IssueDetail: { issueId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Issues: undefined;
  Agents: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Extend DarkTheme to preserve the required `fonts` field.
// Explicitly define fonts to guard against Platform.select returning undefined
// on Android new architecture.
const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#3b82f6",
    background: "#0b0b0d",
    card: "#0b0b0d",
    text: "#ffffff",
    border: "#1a1a1f",
    notification: "#3b82f6",
  },
  fonts: DarkTheme.fonts ?? {
    regular: { fontFamily: "sans-serif", fontWeight: "400" as const },
    medium: { fontFamily: "sans-serif-medium", fontWeight: "500" as const },
    bold: { fontFamily: "sans-serif", fontWeight: "700" as const },
    heavy: { fontFamily: "sans-serif", fontWeight: "900" as const },
  },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "📊",
    Issues: "📋",
    Agents: "🤖",
    Settings: "⚙️",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? "●"}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#0b0b0d" },
        headerTintColor: "#ffffff",
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#0b0b0d",
          borderTopColor: "#1a1a1f",
        },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="Issues"
        component={IssuesScreen as React.ComponentType}
        options={{ title: "Issues" }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentsScreen}
        options={{ title: "Agents" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0b0b0d",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={LoginScreen as React.ComponentType} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0b0b0d" },
          headerTintColor: "#ffffff",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#0b0b0d" },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="IssueDetail"
          component={IssueDetailScreen as React.ComponentType}
          options={{ title: "Issue" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
