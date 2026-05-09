import { NextResponse } from "next/server";
import { getModelConfigError, hasModelConfig, runWorkflow } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { ProductView, WorkflowOutput, WorkflowType } from "@/lib/types";
import { toProductView } from "@/lib/views";

export const runtime = "nodejs";

const workflowTypes: WorkflowType[] = [
  "thirty_notes",
  "content_calendar",
  "video_scripts",
  "support_scripts",
  "competitor_analysis",
  "data_review",
  "product_scoring",
  "product_page",
  "comment_ops",
  "viral_reuse",
  "seo_keywords",
  "ad_strategy"
];

type WorkflowBody = {
  type?: WorkflowType;
  productId?: string;
  userInput?: string;
};

function noteToMarkdown(note: WorkflowOutput["notes"][number]) {
  return [
    `# ${note.title}`,
    "",
    `封面：${note.coverText}`,
    "",
    note.body,
    "",
    `标签：${note.tags.join(" ")}`,
    "",
    `拍摄建议：${note.shootingSuggestion}`,
    "",
    `适合人群：${note.targetAudience}`,
    "",
    `风险提示：${note.riskTip}`
  ].join("\n");
}

function scriptToMarkdown(script: WorkflowOutput["scripts"][number]) {
  return [
    `# ${script.title}`,
    "",
    `开头钩子：${script.hook}`,
    "",
    "镜头：",
    ...script.shots.map((shot, index) => `${index + 1}. ${shot}`),
    "",
    `口播：${script.voiceover}`,
    "",
    `结尾：${script.ending}`
  ].join("\n");
}

function supportToMarkdown(reply: WorkflowOutput["supportReplies"][number]) {
  return [`# ${reply.scenario}`, "", reply.reply].join("\n");
}

function buildProductPrompt(product: ProductView | null, userInput: string) {
  if (!product) {
    return userInput;
  }

  return [
    userInput,
    "",
    "产品资料：",
    `产品名：${product.name}`,
    `类目：${product.category}`,
    `适合对象：${product.targetPet}`,
    `展示价格：${product.price ?? "未填写"}`,
    `成本价：${product.costPrice ?? "未填写"}`,
    `建议售价：${product.salePrice ?? "未填写"}`,
    `库存：${product.stock ?? "未填写"}`,
    `发货周期：${product.shippingTime ?? "未填写"}`,
    `材质：${product.material ?? "未填写"}`,
    `尺寸：${product.size ?? "未填写"}`,
    `核心卖点：${product.sellingPoints}`,
    `主推卖点：${product.mainSellingPoint ?? "未填写"}`,
    `目标人群：${product.targetAudience ?? "未填写"}`,
    `用户痛点：${product.painPoints ?? "未填写"}`,
    `禁止宣传词：${product.forbiddenWords ?? "未填写"}`,
    `竞品价格：${product.competitorPrice ?? "未填写"}`,
    `差异化：${product.differentiation ?? "未填写"}`,
    `是否适合投流：${product.suitableForAds ?? "未判断"}`,
    `是否适合达人合作：${product.suitableForKoc ?? "未判断"}`,
    `注意事项：${product.cautions ?? "未填写"}`,
    `适合场景：${product.scenes ?? "未填写"}`,
    `情绪价值：${product.emotionalValue ?? "未填写"}`,
    `博主人设：${product.userPersona ?? "未填写"}`
  ].join("\n");
}

async function persistWorkflowOutput({
  type,
  productId,
  userInput,
  output
}: {
  type: WorkflowType;
  productId: string | null;
  userInput: string;
  output: WorkflowOutput;
}) {
  const createdAssets = [];

  for (const note of output.notes) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          productId,
          type: "note",
          title: note.title,
          body: noteToMarkdown(note),
          tags: note.tags.join(" "),
          source: type
        }
      })
    );
  }

  for (const script of output.scripts) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          productId,
          type: "video_script",
          title: script.title,
          body: scriptToMarkdown(script),
          source: type
        }
      })
    );
  }

  for (const reply of output.supportReplies) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          productId,
          type: "support_reply",
          title: reply.scenario,
          body: supportToMarkdown(reply),
          source: type
        }
      })
    );
  }

  const createdCalendarItems = await Promise.all(
    output.calendar.map((item) =>
      prisma.calendarItem.create({
        data: {
          productId,
          day: item.day,
          topic: item.topic,
          format: item.format,
          angle: item.angle,
          assetTitle: item.assetTitle,
          goal: item.goal ?? null
        }
      })
    )
  );

  if (output.analysisMarkdown) {
    createdAssets.push(
      await prisma.contentAsset.create({
        data: {
          productId,
          type: type,
          title: output.summary.slice(0, 80) || "运营分析",
          body: output.analysisMarkdown,
          source: type
        }
      })
    );
  }

  if (type === "competitor_analysis") {
    await prisma.competitorAnalysis.create({
      data: {
        title: output.summary.slice(0, 60) || "竞品笔记拆解",
        competitorName: null,
        price: null,
        noteText: userInput,
        sellingPoints: null,
        userQuestions: null,
        weakness: null,
        opportunities: null,
        result: output.analysisMarkdown
      }
    });
  }

  if (type === "data_review") {
    await prisma.dataReview.create({
      data: {
        title: output.summary.slice(0, 60) || "笔记数据复盘",
        metrics: userInput,
        result: output.analysisMarkdown
      }
    });
  }

  await prisma.task.create({
    data: {
      title: output.summary.slice(0, 60) || "商业工作流生成",
      userInput,
      selectedRoleIds: JSON.stringify([]),
      finalSummary: output.analysisMarkdown || output.summary,
      workflowType: type,
      productId
    }
  });

  return {
    assetCount: createdAssets.length,
    calendarCount: createdCalendarItems.length
  };
}

export async function POST(request: Request) {
  if (!hasModelConfig()) {
    return NextResponse.json(
      { error: getModelConfigError() },
      { status: 400 }
    );
  }

  const body = (await request.json()) as WorkflowBody;
  const type = body.type;

  if (!type || !workflowTypes.includes(type)) {
    return NextResponse.json({ error: "未知工作流类型。" }, { status: 400 });
  }

  const userInput = body.userInput?.trim();
  if (!userInput) {
    return NextResponse.json({ error: "请输入工作流说明。" }, { status: 400 });
  }

  const product = body.productId
    ? await prisma.product.findUnique({ where: { id: body.productId } })
    : null;
  const productView = product ? toProductView(product) : null;
  const output = await runWorkflow({
    type,
    product: productView,
    userInput: buildProductPrompt(productView, userInput)
  });

  const persistence = await persistWorkflowOutput({
    type,
    productId: product?.id ?? null,
    userInput,
    output
  });

  return NextResponse.json({ output, persistence });
}
