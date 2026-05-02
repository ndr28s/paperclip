import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import {
  YStack,
  XStack,
  H3,
  H4,
  Text,
  Card,
  Button,
  Input,
  Spinner,
  Separator,
  Circle,
} from "tamagui";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { authApi } from "../api/client";

export function SettingsScreen() {
  const { user, signOut, refreshProfile } = useAuth();
  const { companies, activeCompany, setActiveCompany } = useCompany();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({ name: name.trim() || undefined });
      await refreshProfile();
      setEditing(false);
      Alert.alert("Success", "Profile updated.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const initials = (user?.name ?? user?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0b0d" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <YStack gap="$4">
        <H3 color="$color12">Settings</H3>

        {/* Profile Card */}
        <Card
          backgroundColor="$color3"
          borderColor="$color5"
          borderWidth={1}
          borderRadius="$4"
          padding="$4"
        >
          <YStack gap="$4">
            <H4 color="$color11">Profile</H4>
            <Separator borderColor="$color5" />

            {/* Avatar row */}
            <XStack gap="$3" alignItems="center">
              <Circle
                size={56}
                backgroundColor="$blue9"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" size="$5" fontWeight="700">
                  {initials}
                </Text>
              </Circle>
              <YStack flex={1}>
                <Text color="$color12" size="$4" fontWeight="600">
                  {user?.name ?? "Anonymous"}
                </Text>
                <Text color="$color9" size="$3">
                  {user?.email ?? "No email"}
                </Text>
              </YStack>
            </XStack>

            {/* Edit form */}
            {editing ? (
              <YStack gap="$3">
                <YStack gap="$1">
                  <Text color="$color11" size="$3" fontWeight="600">
                    Display Name
                  </Text>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    autoCapitalize="words"
                    backgroundColor="$color2"
                    borderColor="$color5"
                    color="$color12"
                    placeholderTextColor="#666"
                    size="$4"
                  />
                </YStack>
                <XStack gap="$2">
                  <Button
                    flex={1}
                    size="$3"
                    onPress={handleSaveProfile}
                    disabled={saving}
                    backgroundColor="$blue9"
                    color="white"
                    icon={saving ? <Spinner size="small" color="white" /> : undefined}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    flex={1}
                    size="$3"
                    variant="outlined"
                    onPress={() => {
                      setEditing(false);
                      setName(user?.name ?? "");
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </XStack>
              </YStack>
            ) : (
              <Button
                size="$3"
                variant="outlined"
                onPress={() => {
                  setName(user?.name ?? "");
                  setEditing(true);
                }}
                alignSelf="flex-start"
              >
                Edit Profile
              </Button>
            )}
          </YStack>
        </Card>

        {/* Workspace Switcher */}
        {companies.length > 1 && (
          <Card
            backgroundColor="$color3"
            borderColor="$color5"
            borderWidth={1}
            borderRadius="$4"
            padding="$4"
          >
            <YStack gap="$3">
              <H4 color="$color11">Workspace</H4>
              <Separator borderColor="$color5" />
              <YStack gap="$2">
                {companies.map((company) => (
                  <XStack
                    key={company.id}
                    gap="$3"
                    alignItems="center"
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    backgroundColor={
                      activeCompany?.id === company.id ? "$color4" : "$color2"
                    }
                    borderRadius="$3"
                    onPress={() => setActiveCompany(company)}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Circle
                      size={32}
                      backgroundColor="$blue8"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="white" size="$2" fontWeight="700">
                        {company.name[0].toUpperCase()}
                      </Text>
                    </Circle>
                    <Text
                      flex={1}
                      color="$color12"
                      size="$4"
                      fontWeight={
                        activeCompany?.id === company.id ? "600" : "400"
                      }
                    >
                      {company.name}
                    </Text>
                    {activeCompany?.id === company.id && (
                      <Text color="$blue10" size="$3">
                        ✓
                      </Text>
                    )}
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* App Info */}
        <Card
          backgroundColor="$color3"
          borderColor="$color5"
          borderWidth={1}
          borderRadius="$4"
          padding="$4"
        >
          <YStack gap="$3">
            <H4 color="$color11">App Info</H4>
            <Separator borderColor="$color5" />
            <XStack justifyContent="space-between">
              <Text color="$color9" size="$3">
                Version
              </Text>
              <Text color="$color12" size="$3">
                0.0.1
              </Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text color="$color9" size="$3">
                Platform
              </Text>
              <Text color="$color12" size="$3">
                React Native + Expo
              </Text>
            </XStack>
            {activeCompany && (
              <XStack justifyContent="space-between">
                <Text color="$color9" size="$3">
                  Workspace
                </Text>
                <Text color="$color12" size="$3">
                  {activeCompany.name}
                </Text>
              </XStack>
            )}
          </YStack>
        </Card>

        {/* Sign Out */}
        <Button
          onPress={handleSignOut}
          disabled={signingOut}
          backgroundColor="$red3"
          borderColor="$red6"
          borderWidth={1}
          color="$red10"
          size="$4"
          fontWeight="600"
          icon={
            signingOut ? <Spinner size="small" color="$red10" /> : undefined
          }
        >
          {signingOut ? "Signing out…" : "Sign Out"}
        </Button>
      </YStack>
    </ScrollView>
  );
}
