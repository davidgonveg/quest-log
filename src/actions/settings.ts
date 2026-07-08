"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/week";

export async function updateSettings(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    const user = await getUser();
    await prisma.user.update({ where: { id: user.id }, data: { name } });
  }

  for (const key of ["penaltyXp", "penaltyCoins"] as const) {
    const value = parseInt(String(formData.get(key) ?? ""), 10);
    if (Number.isFinite(value) && value >= 0) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/");
}
