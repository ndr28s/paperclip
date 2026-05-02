import type { UIAdapterModule } from "../types";
import {
  parseOpenAiCompatibleStdoutLine,
  buildOpenAiCompatibleConfig,
} from "@paperclipai/adapter-openai-compatible/ui";
import { SchemaConfigFields } from "../schema-config-fields";

export const openAiCompatibleUIAdapter: UIAdapterModule = {
  type: "openai_compatible",
  label: "OpenAI-compatible API",
  parseStdoutLine: parseOpenAiCompatibleStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildOpenAiCompatibleConfig,
};
