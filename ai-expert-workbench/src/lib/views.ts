import type {
  CalendarItem,
  CompetitorAnalysis,
  ContentAsset,
  DataReview,
  Product
} from "@prisma/client";
import type {
  CalendarItemView,
  CompetitorAnalysisView,
  ContentAssetView,
  DataReviewView,
  ProductView
} from "@/lib/types";

export function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    targetPet: product.targetPet,
    price: product.price,
    costPrice: product.costPrice,
    salePrice: product.salePrice,
    stock: product.stock,
    shippingTime: product.shippingTime,
    material: product.material,
    size: product.size,
    sellingPoints: product.sellingPoints,
    mainSellingPoint: product.mainSellingPoint,
    targetAudience: product.targetAudience,
    painPoints: product.painPoints,
    forbiddenWords: product.forbiddenWords,
    competitorPrice: product.competitorPrice,
    differentiation: product.differentiation,
    suitableForAds: product.suitableForAds,
    suitableForKoc: product.suitableForKoc,
    cautions: product.cautions,
    scenes: product.scenes,
    createdAt: product.createdAt.toISOString()
  };
}

export function toAssetView(asset: ContentAsset & { product?: { name: string } | null }): ContentAssetView {
  return {
    id: asset.id,
    productId: asset.productId,
    productName: asset.product?.name ?? null,
    type: asset.type,
    title: asset.title,
    body: asset.body,
    tags: asset.tags,
    source: asset.source,
    createdAt: asset.createdAt.toISOString()
  };
}

export function toCalendarItemView(
  item: CalendarItem & { product?: { name: string } | null }
): CalendarItemView {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product?.name ?? null,
    day: item.day,
    topic: item.topic,
    format: item.format,
    angle: item.angle,
    assetTitle: item.assetTitle,
    goal: item.goal,
    publishAt: item.publishAt,
    noteUrl: item.noteUrl,
    metrics: item.metrics,
    reviewNote: item.reviewNote,
    status: item.status,
    createdAt: item.createdAt.toISOString()
  };
}

export function toCompetitorAnalysisView(item: CompetitorAnalysis): CompetitorAnalysisView {
  return {
    id: item.id,
    title: item.title,
    competitorName: item.competitorName,
    price: item.price,
    noteText: item.noteText,
    sellingPoints: item.sellingPoints,
    userQuestions: item.userQuestions,
    weakness: item.weakness,
    opportunities: item.opportunities,
    result: item.result,
    createdAt: item.createdAt.toISOString()
  };
}

export function toDataReviewView(item: DataReview): DataReviewView {
  return {
    id: item.id,
    title: item.title,
    metrics: item.metrics,
    result: item.result,
    createdAt: item.createdAt.toISOString()
  };
}
