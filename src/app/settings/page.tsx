import { getPenaltySettings, getUser } from "@/lib/week";
import { updateSettings } from "@/actions/settings";
import { closeCurrentWeek } from "@/actions/week";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Label, PrimaryButton, TextInput } from "@/components/ui/Form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, penalties] = await Promise.all([getUser(), getPenaltySettings()]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Ajustes</h1>

      <Card>
        <SectionTitle>Perfil y penalizaciones</SectionTitle>
        <form action={updateSettings} className="mt-3 space-y-3">
          <Label>
            Tu nombre
            <TextInput name="name" defaultValue={user.name} required />
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label>
              XP por crítico fallido
              <TextInput
                name="penaltyXp"
                type="number"
                min={0}
                defaultValue={penalties.penaltyXp}
              />
            </Label>
            <Label>
              Monedas por crítico fallido
              <TextInput
                name="penaltyCoins"
                type="number"
                min={0}
                defaultValue={penalties.penaltyCoins}
              />
            </Label>
          </div>
          <PrimaryButton type="submit">Guardar cambios</PrimaryButton>
        </form>
      </Card>

      <Card>
        <SectionTitle>Copia de seguridad</SectionTitle>
        <p className="mt-2 text-sm text-muted">
          Descarga una copia íntegra de todos tus datos (tareas, objetivos,
          progreso y monedas). Guárdala fuera del servidor: es tu red de
          seguridad si algo le pasa a la base de datos.
        </p>
        <a
          href="/api/export"
          download
          className="hud-chamfer-sm mt-3 flex min-h-11 w-full items-center justify-center border border-edge bg-surface-2 px-4 font-display text-sm font-semibold transition-opacity active:opacity-70"
        >
          Descargar copia
        </a>
      </Card>

      <Card className="border-red/30">
        <SectionTitle>Zona de cierre</SectionTitle>
        <p className="mt-2 text-sm text-muted">
          La semana se cierra sola cuando termina el domingo: los objetivos
          críticos incumplidos restan puntos. Puedes cerrarla antes si ya está
          decidida.
        </p>
        <form action={closeCurrentWeek} className="mt-3">
          <button className="hud-chamfer-sm min-h-11 w-full border border-red/50 bg-red-soft px-4 font-display text-sm font-semibold text-red transition-opacity active:opacity-70">
            Cerrar la semana ahora
          </button>
        </form>
      </Card>
    </div>
  );
}
