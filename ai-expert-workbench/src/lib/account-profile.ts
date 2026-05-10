import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AccountProfile } from "@/lib/types";

const profilePath = join(process.cwd(), ".account-profile.json");

export const defaultAccountProfile: AccountProfile = {
  accountName: "",
  positioning: "",
  targetAudience: "",
  toneStyle: "",
  preferredPhrases: "",
  forbiddenPhrases: "",
  brandBoundaries: ""
};

export function getAccountProfile() {
  if (!existsSync(profilePath)) {
    return defaultAccountProfile;
  }

  try {
    const parsed = JSON.parse(readFileSync(profilePath, "utf8")) as Partial<AccountProfile>;
    return { ...defaultAccountProfile, ...parsed };
  } catch {
    return defaultAccountProfile;
  }
}

export function saveAccountProfile(profile: AccountProfile) {
  const payload: AccountProfile = {
    accountName: profile.accountName.trim(),
    positioning: profile.positioning.trim(),
    targetAudience: profile.targetAudience.trim(),
    toneStyle: profile.toneStyle.trim(),
    preferredPhrases: profile.preferredPhrases.trim(),
    forbiddenPhrases: profile.forbiddenPhrases.trim(),
    brandBoundaries: profile.brandBoundaries.trim()
  };

  writeFileSync(profilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}
