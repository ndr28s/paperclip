import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "tamagui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import sharedConfig from "@paperclipai/tamagui-config";
import { AuthProvider } from "./src/context/AuthContext";
import { CompanyProvider } from "./src/context/CompanyContext";
import { AppNavigator } from "./src/navigation";

// Cross-version cast: tamagui-config is typechecked against the workspace's
// React 19 types, while mobile uses React 18.3.1 to match RN 0.76.
const config = sharedConfig as never;

export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <SafeAreaProvider>
        <AuthProvider>
          <CompanyProvider>
            <AppNavigator />
          </CompanyProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}
