import type { UIAdapterModule } from "../types";
import { parseOpenAiCompatibleStdoutLine } from "@paperclipai/adapter-openai-compatible/ui";
import { SchemaConfigFields, buildSchemaAdapterConfig } from "../schema-config-fields";

export const openAiCompatibleUIAdapter: UIAdapterModule = {
  type: "openai_compatible",
  label: "OpenAI-compatible API",
  parseStdoutLine: parseOpenAiCompatibleStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildSchemaAdapterConfig,
};
