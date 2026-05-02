import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import {
  YStack,
  XStack,
  H2,
  Text,
  Input,
  Button,
  Paragraph,
  Spinner,
} from "tamagui";
import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(name.trim(), email.trim(), password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0b0b0d" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack padding="$6" gap="$4" maxWidth={480} alignSelf="center" width="100%">
          {/* Logo / Title */}
          <YStack gap="$2" marginBottom="$4">
            <H2 color="$color12" fontWeight="700">
              📎 Paperclip
            </H2>
            <Paragraph color="$color10" size="$4">
              {mode === "login"
                ? "Sign in to your workspace"
                : "Create a new account"}
            </Paragraph>
          </YStack>

          {/* Form */}
          <YStack gap="$3">
            {mode === "signup" && (
              <YStack gap="$1">
                <Text color="$color11" size="$3" fontWeight="600">
                  Name
                </Text>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  backgroundColor="$color3"
                  borderColor="$color5"
                  color="$color12"
                  placeholderTextColor="#666"
                  size="$4"
                />
              </YStack>
            )}

            <YStack gap="$1">
              <Text color="$color11" size="$3" fontWeight="600">
                Email
              </Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                backgroundColor="$color3"
                borderColor="$color5"
                color="$color12"
                placeholderTextColor="#666"
                size="$4"
              />
            </YStack>

            <YStack gap="$1">
              <Text color="$color11" size="$3" fontWeight="600">
                Password
              </Text>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                backgroundColor="$color3"
                borderColor="$color5"
                color="$color12"
                placeholderTextColor="#666"
                size="$4"
              />
            </YStack>
          </YStack>

          {/* Submit */}
          <Button
            onPress={handleSubmit}
            disabled={loading}
            backgroundColor="$blue9"
            color="white"
            size="$4"
            fontWeight="600"
            marginTop="$2"
            icon={loading ? <Spinner color="white" size="small" /> : undefined}
          >
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </Button>

          {/* Toggle mode */}
          <XStack justifyContent="center" gap="$2" marginTop="$2">
            <Text color="$color10" size="$3">
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </Text>
            <Text
              color="$blue10"
              size="$3"
              fontWeight="600"
              onPress={() => {
                setMode(mode === "login" ? "signup" : "login");
                setName("");
                setEmail("");
                setPassword("");
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
