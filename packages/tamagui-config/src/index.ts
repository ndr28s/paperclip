// Shared Tamagui configuration for paperclip apps (web/desktop/mobile).
// Built on top of @tamagui/config v4 with paperclip brand tweaks.

import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";

export const tamaguiConfig = createTamagui(defaultConfig);

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  // biome-ignore lint/suspicious/noEmptyInterface: Tamagui module-augmentation pattern
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
