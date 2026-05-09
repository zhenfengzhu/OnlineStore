import { NextResponse } from "next/server";
import {
  getProviderConfig,
  getPublicModelOptions,
  saveModelConfig,
  type ModelProviderId
} from "@/lib/model-providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPublicModelOptions());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      providerId?: ModelProviderId;
      apiKey?: string;
      model?: string;
      baseURL?: string;
    };

    if (!body.providerId) {
      return NextResponse.json({ error: "请选择模型供应商。" }, { status: 400 });
    }

    const provider = getProviderConfig(body.providerId);
    if (provider.id !== body.providerId) {
      return NextResponse.json({ error: "未知模型供应商。" }, { status: 400 });
    }

    if (!body.apiKey?.trim()) {
      return NextResponse.json({ error: "请填写 API Key。" }, { status: 400 });
    }

    if (provider.id === "custom" && !body.baseURL?.trim()) {
      return NextResponse.json({ error: "自定义接口必须填写 Base URL。" }, { status: 400 });
    }

    saveModelConfig({
      providerId: provider.id,
      apiKey: body.apiKey,
      model: body.model || provider.defaultModel,
      baseURL: body.baseURL
    });

    return NextResponse.json(getPublicModelOptions());
  } catch (error) {
    const message = error instanceof Error ? error.message : "模型设置保存失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
