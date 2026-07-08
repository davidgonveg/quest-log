import { prisma } from "@/lib/db";
import { getUser } from "@/lib/week";
import { createReward, deactivateReward, redeemReward } from "@/actions/shop";
import { Card, SectionTitle } from "@/components/ui/Card";
import { AddDisclosure, Label, PrimaryButton, TextInput } from "@/components/ui/Form";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [user, rewards, history] = await Promise.all([
    getUser(),
    prisma.reward.findMany({ where: { active: true }, orderBy: { cost: "asc" } }),
    prisma.redemption.findMany({
      include: { reward: { select: { title: true, icon: true } } },
      orderBy: { redeemedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Tienda</h1>
        <div className="hud-chamfer-sm flex items-center gap-1.5 bg-gold-soft px-3 py-2">
          <span aria-hidden>🪙</span>
          <span className="font-display text-lg font-semibold text-gold">
            {user.coins}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted">
        Las monedas se ganan cumpliendo. Los premios son reales: cuando canjeas
        uno, te lo has ganado.
      </p>

      <div className="space-y-3">
        {rewards.map((r) => {
          const affordable = user.coins >= r.cost;
          return (
            <Card key={r.id} className="rise-in flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {r.icon ?? "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-gold">{r.cost} 🪙</p>
              </div>
              <form action={deactivateReward.bind(null, r.id)}>
                <button
                  className="min-h-11 px-1 text-muted hover:text-red"
                  aria-label={`Quitar ${r.title} de la tienda`}
                >
                  ✕
                </button>
              </form>
              <form action={redeemReward.bind(null, r.id)}>
                <button
                  disabled={!affordable}
                  className={`hud-chamfer-sm min-h-11 px-4 font-display text-sm font-semibold transition-opacity active:opacity-70 ${
                    affordable
                      ? "bg-gold text-black"
                      : "cursor-not-allowed bg-surface-2 text-muted"
                  }`}
                  title={affordable ? undefined : "Te faltan monedas"}
                >
                  Canjear
                </button>
              </form>
            </Card>
          );
        })}
        {rewards.length === 0 && (
          <Card>
            <p className="text-sm text-muted">
              La tienda está vacía. Crea tu primer premio abajo.
            </p>
          </Card>
        )}
      </div>

      <AddDisclosure label="Nuevo premio">
        <form action={createReward} className="space-y-3">
          <div className="grid grid-cols-[1fr_4.5rem] gap-3">
            <Label>
              Premio
              <TextInput name="title" required placeholder="Ej. Ver un capítulo" />
            </Label>
            <Label>
              Icono
              <TextInput name="icon" placeholder="📺" maxLength={4} />
            </Label>
          </div>
          <Label>
            Coste en monedas
            <TextInput name="cost" type="number" min={1} required placeholder="50" />
          </Label>
          <PrimaryButton type="submit">Añadir a la tienda</PrimaryButton>
        </form>
      </AddDisclosure>

      {history.length > 0 && (
        <Card>
          <SectionTitle>Últimos canjes</SectionTitle>
          <ul className="mt-2 space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between text-sm">
                <span className="truncate">
                  {h.reward.icon ? `${h.reward.icon} ` : ""}
                  {h.reward.title}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  −{h.cost} 🪙 ·{" "}
                  {h.redeemedAt.toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
