import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/views";

export const runtime = "nodejs";

type ProductBody = {
  id?: string;
  name?: string;
  category?: string;
  targetPet?: string;
  price?: string;
  costPrice?: string;
  salePrice?: string;
  stock?: string;
  shippingTime?: string;
  material?: string;
  size?: string;
  sellingPoints?: string;
  mainSellingPoint?: string;
  targetAudience?: string;
  painPoints?: string;
  forbiddenWords?: string;
  competitorPrice?: string;
  differentiation?: string;
  suitableForAds?: string;
  suitableForKoc?: string;
  cautions?: string;
  scenes?: string;
  emotionalValue?: string;
  userPersona?: string;
};

function productData(body: ProductBody) {
  return {
    name: body.name?.trim() || "",
    category: body.category?.trim() || "宠物玩具",
    targetPet: body.targetPet?.trim() || "猫狗通用",
    price: body.price?.trim() || null,
    costPrice: body.costPrice?.trim() || null,
    salePrice: body.salePrice?.trim() || null,
    stock: body.stock?.trim() || null,
    shippingTime: body.shippingTime?.trim() || null,
    material: body.material?.trim() || null,
    size: body.size?.trim() || null,
    sellingPoints: body.sellingPoints?.trim() || "",
    mainSellingPoint: body.mainSellingPoint?.trim() || null,
    targetAudience: body.targetAudience?.trim() || null,
    painPoints: body.painPoints?.trim() || null,
    forbiddenWords: body.forbiddenWords?.trim() || null,
    competitorPrice: body.competitorPrice?.trim() || null,
    differentiation: body.differentiation?.trim() || null,
    suitableForAds: body.suitableForAds?.trim() || null,
    suitableForKoc: body.suitableForKoc?.trim() || null,
    cautions: body.cautions?.trim() || null,
    scenes: body.scenes?.trim() || null,
    emotionalValue: body.emotionalValue?.trim() || null,
    userPersona: body.userPersona?.trim() || null
  };
}

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ products: products.map(toProductView) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductBody;

  if (!body.name?.trim() || !body.sellingPoints?.trim()) {
    return NextResponse.json({ error: "产品名和核心卖点必填。" }, { status: 400 });
  }

  const product = await prisma.product.create({ data: productData(body) });

  return NextResponse.json({ product: toProductView(product) });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as ProductBody;

  if (!body.id) {
    return NextResponse.json({ error: "缺少产品 ID。" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.sellingPoints?.trim()) {
    return NextResponse.json({ error: "产品名和核心卖点必填。" }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id: body.id },
    data: productData(body)
  });

  return NextResponse.json({ product: toProductView(product) });
}
