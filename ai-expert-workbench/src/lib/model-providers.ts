import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ModelProviderId = "openai" | "deepseek" | "tongyi" | "zhipu" | "doubao" | "custom";

export type ModelProviderConfig = {
  id: ModelProviderId;
  name: string;
  baseURL: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  apiStyle: "responses" | "chat";
};

export const MODEL_PROVIDERS: ModelProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-5.2",
    apiStyle: "responses"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    apiStyle: "chat"
  },
  {
    id: "tongyi",
    name: "通义千问",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "TONGYI_API_KEY",
    modelEnv: "TONGYI_MODEL",
    defaultModel: "qwen-plus",
    apiStyle: "chat"
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelEnv: "ZHIPU_MODEL",
    defaultModel: "glm-4-plus",
    apiStyle: "chat"
  },
  {
    id: "doubao",
    name: "豆包",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyEnv: "DOUBAO_API_KEY",
    modelEnv: "DOUBAO_MODEL",
    defaultModel: "doubao-pro-32k",
    apiStyle: "chat"
  },
  {
    id: "custom",
    name: "自定义兼容接口",
    baseURL: "",
    apiKeyEnv: "CUSTOM_MODEL_API_KEY",
    modelEnv: "CUSTOM_MODEL_NAME",
    defaultModel: "custom-model",
    apiStyle: "chat"
  }
];

export type SavedModelConfig = {
  providerId: ModelProviderId;
  model: string;
  apiKey: string;
  baseURL?: string;
};

const configPath = join(process.cwd(), ".model-config.json");

function readSavedModelConfig(): SavedModelConfig | null {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf8")) as SavedModelConfig;
  } catch {
    return null;
  }
}

export function saveModelConfig(config: SavedModelConfig) {
  const provider = getProviderConfig(config.providerId);
  const payload: SavedModelConfig = {
    providerId: provider.id,
    apiKey: config.apiKey.trim(),
    model: config.model.trim() || provider.defaultModel,
    baseURL: provider.id === "custom" ? config.baseURL?.trim() || "" : provider.baseURL
  };

  writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export function getProviderConfig(providerId = process.env.MODEL_PROVIDER ?? "openai") {
  return MODEL_PROVIDERS.find((provider) => provider.id === providerId) ?? MODEL_PROVIDERS[0];
}

export function getActiveModelConfig() {
  const saved = readSavedModelConfig();
  const provider = getProviderConfig(saved?.providerId);
  const baseURL =
    saved?.baseURL?.trim() ||
    (provider.id === "custom" ? process.env.CUSTOM_MODEL_BASE_URL?.trim() || "" : provider.baseURL);
  const apiKey = saved?.apiKey?.trim() || process.env[provider.apiKeyEnv]?.trim() || "";
  const model = saved?.model?.trim() || process.env[provider.modelEnv]?.trim() || provider.defaultModel;

  return {
    provider,
    baseURL,
    apiKey,
    model,
    configured: Boolean(apiKey && !apiKey.startsWith("your_") && baseURL)
  };
}

export function getPublicModelOptions() {
  const active = getActiveModelConfig();
  return {
    activeProviderId: active.provider.id,
    activeProviderName: active.provider.name,
    activeModel: active.model,
    activeBaseURL: active.baseURL,
    configured: active.configured,
    providers: MODEL_PROVIDERS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      apiKeyEnv: provider.apiKeyEnv,
      modelEnv: provider.modelEnv,
      defaultModel: provider.defaultModel,
      baseURL: provider.id === "custom" ? "CUSTOM_MODEL_BASE_URL" : provider.baseURL,
      apiStyle: provider.apiStyle
    }))
  };
}
