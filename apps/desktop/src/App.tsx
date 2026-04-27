import { Button, H1, Paragraph, YStack } from "tamagui";

export default function App() {
  return (
    <YStack
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        minHeight: "100vh",
        backgroundColor: "#0b0b0d",
      }}
    >
      <H1>Paperclip Desktop</H1>
      <Paragraph>
        Electron + React 19 + Tamagui scaffolding is ready.
      </Paragraph>
      <Paragraph>
        platform: {window.paperclip?.platform ?? "unknown"} · electron{" "}
        {window.paperclip?.versions?.electron ?? "?"}
      </Paragraph>
      <Button onPress={() => alert("Hello from Tamagui!")}>Test button</Button>
    </YStack>
  );
}
