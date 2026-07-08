"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/week";

export async function createReward(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const cost = parseInt(String(formData.get("cost") ?? ""), 10);
  if (!title || !Number.isFinite(cost) || cost <= 0) return;
  await prisma.reward.create({
    data: { title, cost, icon: String(formData.get("icon") ?? "").trim() || null },
  });
  revalidatePath("/shop");
}

export async function deactivateReward(id: string): Promise<void> {
  await prisma.reward.update({ where: { id }, data: { active: false } });
  revalidatePath("/shop");
}

export async function redeemReward(id: string): Promise<void> {
  const [reward, user] = await Promise.all([
    prisma.reward.findUniqueOrThrow({ where: { id } }),
    getUser(),
  ]);
  // Validación en servidor: sin saldo no hay premio, aunque la UI fallara.
  if (!reward.active || user.coins < reward.cost) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { coins: { decrement: reward.cost } },
    }),
    prisma.redemption.create({ data: { rewardId: reward.id, cost: reward.cost } }),
    prisma.pointsEntry.create({
      data: { coinDelta: -reward.cost, reason: "REDEMPTION", refId: reward.id },
    }),
  ]);
  revalidatePath("/shop");
  revalidatePath("/");
}
