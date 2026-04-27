import { StatusBar } from "expo-status-bar";
import { TamaguiProvider, Button, H1, Paragraph, YStack } from "tamagui";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import sharedConfig from "@paperclipai/tamagui-config";

// Cross-version cast: tamagui-config is typechecked against the workspace's
// React 19 types, while mobile uses React 18.3.1 to match RN 0.76. Runtime is
// identical; revisit when RN officially supports React 19.
const config = sharedConfig as never;

export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0d" }}>
          <YStack
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
            }}
          >
            <H1>Paperclip Mobile</H1>
            <Paragraph>
              Expo + React Native + Tamagui scaffolding is ready.
            </Paragraph>
            <Button onPress={() => alert("Hello from Tamagui!")}>
              Test button
            </Button>
          </YStack>
          <StatusBar style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}
