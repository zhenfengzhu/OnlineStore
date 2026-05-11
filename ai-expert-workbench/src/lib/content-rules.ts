import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_XIAOHONGSHU_GRAPHIC_RULES,
  normalizeXiaohongshuGraphicRules
} from "@/lib/content-rule-defaults";
import type { ContentRulesConfig } from "@/lib/types";

const rulesPath = join(process.cwd(), ".content-rules.json");

export const defaultContentRules: ContentRulesConfig = {
  xiaohongshuGraphicRules: DEFAULT_XIAOHONGSHU_GRAPHIC_RULES
};

export function getContentRules(): ContentRulesConfig {
  if (!existsSync(rulesPath)) {
    return defaultContentRules;
  }

  try {
    const parsed = JSON.parse(readFileSync(rulesPath, "utf8")) as Partial<ContentRulesConfig>;
    return {
      xiaohongshuGraphicRules: normalizeXiaohongshuGraphicRules(parsed.xiaohongshuGraphicRules)
    };
  } catch {
    return defaultContentRules;
  }
}

export function saveContentRules(config: Partial<ContentRulesConfig>) {
  const payload: ContentRulesConfig = {
    xiaohongshuGraphicRules: normalizeXiaohongshuGraphicRules(config.xiaohongshuGraphicRules)
  };

  writeFileSync(rulesPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}
