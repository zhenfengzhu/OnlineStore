export const DEFAULT_XIAOHONGSHU_GRAPHIC_RULES = [
  "标题 15-25 字，优先用数字、疑问、情绪、清单、反差钩子。",
  "开头 3 行直接给痛点、结果或反差，不做长铺垫。",
  "正文每段 2-3 行，少量 emoji 分隔，表达像朋友聊天。",
  "卖点必须具体到场景、时长、反应和使用细节。",
  "加入轻微缺点或适用边界，避免全篇硬广。",
  "标签覆盖话题、品类、人群、场景，结尾设计评论互动。"
];

export function normalizeXiaohongshuGraphicRules(rules: unknown) {
  if (!Array.isArray(rules)) return DEFAULT_XIAOHONGSHU_GRAPHIC_RULES;

  const cleaned = rules
    .map((rule) => (typeof rule === "string" ? rule.trim() : ""))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : DEFAULT_XIAOHONGSHU_GRAPHIC_RULES;
}

export function formatXiaohongshuGraphicRules(rules: string[]) {
  return [
    "小红书图文规则：",
    ...normalizeXiaohongshuGraphicRules(rules).map((rule, index) => `${index + 1}. ${rule}`)
  ].join("\n");
}
