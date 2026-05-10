import type { CalendarItem, ContentAsset } from "@prisma/client";
import type { CalendarItemView, ContentAssetView } from "@/lib/types";

export function toAssetView(asset: ContentAsset): ContentAssetView {
  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    body: asset.body,
    tags: asset.tags,
    source: asset.source,
    parentId: asset.parentId,
    variantType: asset.variantType,
    createdAt: asset.createdAt.toISOString()
  };
}

export function toCalendarItemView(item: CalendarItem): CalendarItemView {
  return {
    id: item.id,
    day: item.day,
    topic: item.topic,
    format: item.format,
    angle: item.angle,
    assetTitle: item.assetTitle,
    goal: item.goal,
    status: item.status,
    createdAt: item.createdAt.toISOString()
  };
}
