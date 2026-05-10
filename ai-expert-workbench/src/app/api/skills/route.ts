import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 使用原生查询绕过尚未生成的 Prisma Client 类型限制
    const skills = await prisma.$queryRawUnsafe(
      `SELECT * FROM ExpertSkill ORDER BY createdAt DESC`
    );
    return NextResponse.json({ skills });
  } catch (error) {
    console.error("GET Skills Error:", error);
    return NextResponse.json({ skills: [] }); // 失败时返回空列表，触发前端初始化
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, prompt, icon, placeholder, inputLabel } = body;

    if (!name || !prompt) {
      return NextResponse.json({ error: "技能名称和提示词必填。" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // 使用原生执行绕过 Prisma Client 类型限制
    await prisma.$executeRawUnsafe(
      `INSERT INTO ExpertSkill (id, name, description, prompt, icon, placeholder, inputLabel, isDefault, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      description || "",
      prompt,
      icon || "Sparkles",
      placeholder || "",
      inputLabel || "请输入内容",
      0,
      now
    );

    return NextResponse.json({ skill: { id, name } });
  } catch (error) {
    console.error("POST Skills Error:", error);
    return NextResponse.json({ error: "创建专家技能失败。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少技能 ID。" }, { status: 400 });
  }

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM ExpertSkill WHERE id = ?`, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Skill Error:", error);
    return NextResponse.json({ error: "删除技能失败。" }, { status: 500 });
  }
}
