import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de privacidad — vivancar',
  description: 'Cómo vivancar recopila, usa y protege tus datos.',
}

const LAST_UPDATED = '31 de agosto de 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-(--color-text-primary)">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-(--color-text-secondary)">
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-(--color-bg-base) px-4 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/brand/logo-white.png"
            alt="vivancar"
            width={2085}
            height={364}
            priority
            unoptimized
            className="h-8 w-auto"
          />
          <div>
            <h1 className="text-2xl font-bold text-(--color-text-primary)">Política de privacidad</h1>
            <p className="mt-1 text-xs text-(--color-text-muted)">Última actualización: {LAST_UPDATED}</p>
          </div>
        </div>

        <Section title="1. Quiénes somos">
          <p>
            Esta política aplica a la app móvil y al sitio web de <strong>vivancar</strong>, una
            plataforma de monitoreo y seguridad vehicular (rastreo GPS y bloqueo/desbloqueo remoto
            de motor). Para consultas sobre esta política o tus datos personales, escríbenos a{' '}
            <a href="mailto:ssanchez@vivancar.cl" className="text-(--color-accent) hover:underline">
              ssanchez@vivancar.cl
            </a>
            .
          </p>
        </Section>

        <Section title="2. Qué datos recopilamos">
          <p>
            <strong className="text-(--color-text-primary)">Datos de cuenta.</strong> Al
            registrarte guardamos tu correo electrónico y, si los indicas, tu nombre y teléfono. Si
            inicias sesión con Google, recibimos el correo y nombre asociados a esa cuenta a través
            del proceso estándar de Google Sign-In.
          </p>
          <p>
            <strong className="text-(--color-text-primary)">Datos del vehículo.</strong> Alias,
            patente, marca, modelo y año que tú mismo ingresas al registrar un vehículo.
          </p>
          <p>
            <strong className="text-(--color-text-primary)">Ubicación GPS del vehículo</strong> —
            no del teléfono. La app nunca solicita ni accede al permiso de ubicación de tu
            dispositivo móvil. La posición que ves en el mapa proviene del dispositivo GPS
            instalado en el vehículo, reportada en tiempo real por nuestro proveedor de telemetría
            (Flespi) y mostrada al momento — no la almacenamos en nuestra base de datos.
          </p>
          <p>
            <strong className="text-(--color-text-primary)">Eventos del vehículo.</strong> Hechos
            puntuales que sí guardamos para historial: desconexión del dispositivo, batería baja,
            encendido/apagado y entrada/salida de geocercas.
          </p>
          <p>
            <strong className="text-(--color-text-primary)">Comandos de seguridad.</strong> Cada
            vez que tú u otra persona con acceso al vehículo envía un comando (por ejemplo,
            bloquear el motor), guardamos un registro de auditoría: quién lo envió, cuándo y el
            resultado.
          </p>
          <p>
            <strong className="text-(--color-text-primary)">Acceso compartido.</strong> Si invitas
            a otra persona a ver o conducir tu vehículo, esa persona podrá acceder a los datos
            correspondientes a su rol (visor, conductor o dueño).
          </p>
        </Section>

        <Section title="3. Para qué usamos tus datos">
          <ul className="list-disc pl-5">
            <li>Operar el servicio: autenticarte, mostrar la ubicación y estado de tus vehículos.</li>
            <li>Ejecutar comandos de seguridad que tú solicitas (bloqueo/desbloqueo de motor).</li>
            <li>Mantener un historial de auditoría de seguridad de los comandos enviados.</li>
            <li>Notificarte eventos relevantes del vehículo (desconexión, batería baja, etc.).</li>
          </ul>
          <p>No usamos tus datos con fines publicitarios y no integramos herramientas de analítica o publicidad de terceros en la app.</p>
        </Section>

        <Section title="4. Con quién compartimos datos">
          <p>Solo compartimos datos con los proveedores que hacen funcionar el servicio, nunca con fines comerciales:</p>
          <ul className="list-disc pl-5">
            <li><strong className="text-(--color-text-primary)">Supabase</strong> — autenticación y base de datos donde vive tu cuenta y la de tus vehículos.</li>
            <li><strong className="text-(--color-text-primary)">Flespi</strong> — plataforma GPS/IoT que provee la telemetría del dispositivo instalado en el vehículo.</li>
            <li><strong className="text-(--color-text-primary)">Google</strong> — únicamente si eliges iniciar sesión con tu cuenta de Google.</li>
            <li><strong className="text-(--color-text-primary)">Vercel</strong> — aloja la aplicación web y el servidor que la respalda.</li>
          </ul>
          <p>No vendemos tus datos a terceros.</p>
        </Section>

        <Section title="5. Cuánto tiempo conservamos tus datos">
          <p>
            Conservamos los datos de tu cuenta y vehículos mientras tu cuenta esté activa. Si
            eliminas un vehículo, marcamos el registro como eliminado pero conservamos el
            historial de comandos de seguridad asociado (registro de auditoría), por la naturaleza
            sensible de esa acción — bloqueo/desbloqueo de un vehículo. Puedes solicitar la
            eliminación completa de tu cuenta escribiéndonos al correo de contacto.
          </p>
        </Section>

        <Section title="6. Cómo protegemos tus datos">
          <p>
            El acceso a tus vehículos está controlado por roles (dueño, conductor, visor) y reglas
            de seguridad a nivel de base de datos, de forma que un usuario solo ve los vehículos a
            los que tiene acceso explícito. Las credenciales de nuestro proveedor de telemetría
            nunca se exponen al dispositivo del usuario — todas las llamadas ocurren desde nuestro
            servidor.
          </p>
        </Section>

        <Section title="7. Tus derechos">
          <p>
            Puedes solicitarnos acceder, corregir o eliminar tus datos personales, o revocar el
            acceso que hayas compartido a un vehículo, escribiendo a{' '}
            <a href="mailto:ssanchez@vivancar.cl" className="text-(--color-accent) hover:underline">
              ssanchez@vivancar.cl
            </a>
            .
          </p>
        </Section>

        <Section title="8. Menores de edad">
          <p>vivancar no está dirigido a menores de 18 años y no recopilamos deliberadamente datos de menores.</p>
        </Section>

        <Section title="9. Cambios a esta política">
          <p>Si actualizamos esta política, publicaremos la nueva versión en esta misma página con la fecha de actualización correspondiente.</p>
        </Section>

        <div className="border-t border-(--color-border) pt-6 text-center">
          <Link href="/login" className="text-sm text-(--color-accent) hover:underline">
            Volver a vivancar
          </Link>
        </div>
      </div>
    </div>
  )
}
