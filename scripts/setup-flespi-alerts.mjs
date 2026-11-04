#!/usr/bin/env node
/**
 * Crea en Flespi lo necesario para las alertas push (geocercas y encendido).
 * Se corre UNA vez por entorno:
 *
 *   1. Calculator de geocercas, selector `geofence`: abre un intervalo
 *      mientras el equipo está dentro de una geocerca. El counter
 *      `geofence_name` guarda el nombre de la geocerca (= uuid de nuestra fila,
 *      ver createGeofence).
 *   2. Calculator de ignición, selector booleano sobre
 *      `engine.ignition.status`: abre un intervalo mientras el motor está
 *      encendido. Detecta la transición, no cada mensaje.
 *   3. Un webhook de plataforma sobre los intervalos de ambos calculators que
 *      llama a POST {url}/api/webhooks/flespi/intervals con el header
 *      x-webhook-token.
 *
 * Los dispositivos se asignan a cada calculator solos, desde la app: al crear
 * su primera geocerca, o cuando alguien activa la alerta de encendido.
 *
 * Uso:
 *   node scripts/setup-flespi-alerts.mjs --url https://app.vivancar.cl
 *
 * Variables de entorno requeridas:
 *   FLESPI_TOKEN, FLESPI_ALERTS_WEBHOOK_TOKEN (genéralo con
 *   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
 *
 * Imprime FLESPI_GEOFENCE_CALC_ID y FLESPI_IGNITION_CALC_ID para cargarlos en Vercel.
 */

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--')) continue
    args[argv[i].slice(2)] = argv[i + 1]
  }
  return args
}

async function flespi(path, token, body) {
  const res = await fetch(`https://flespi.io${path}`, {
    method: 'POST',
    headers: { Authorization: `FlespiToken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.errors?.length) {
    throw new Error(`Flespi ${path} ${res.status}: ${JSON.stringify(json.errors ?? json)}`)
  }
  return json.result[0]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const base = String(args.url ?? '').replace(/\/+$/, '')
  if (!/^https:\/\//.test(base)) {
    console.error('Error: --url debe ser la URL https de la app desplegada.')
    process.exit(1)
  }

  const { FLESPI_TOKEN, FLESPI_ALERTS_WEBHOOK_TOKEN } = process.env
  if (!FLESPI_TOKEN || !FLESPI_ALERTS_WEBHOOK_TOKEN) {
    console.error('Error: faltan FLESPI_TOKEN o FLESPI_ALERTS_WEBHOOK_TOKEN.')
    process.exit(1)
  }

  const geofenceCalc = await flespi('/gw/calcs', FLESPI_TOKEN, [
    {
      name: 'vivancar geocercas',
      selectors: [{ type: 'geofence' }],
      counters: [
        { name: 'geofence_name', type: 'expression', expression: 'geofence()', method: 'first' },
      ],
    },
  ])
  console.log(`✓ calculator de geocercas: ${geofenceCalc.id}`)

  const ignitionCalc = await flespi('/gw/calcs', FLESPI_TOKEN, [
    {
      name: 'vivancar ignicion',
      selectors: [
        {
          type: 'expression',
          expression: 'engine.ignition.status',
          method: 'boolean',
          // Ignora parpadeos de la señal (arranques fallidos, ruido del equipo).
          min_duration: 30,
          // Los equipos reportan cada pocos minutos con el motor encendido; un
          // hueco mayor (túnel, sin cobertura) no debe cortar el intervalo y
          // disparar un "se apagó" falso.
          max_messages_time_diff: 1800,
        },
      ],
    },
  ])
  console.log(`✓ calculator de ignición: ${ignitionCalc.id}`)

  // Posiciones del topic: flespi/interval/gw/calcs/{4}/devices/{6}/{7}
  const webhook = await flespi('/platform/webhooks', FLESPI_TOKEN, [
    {
      name: 'vivancar alertas → app',
      triggers: [
        { topic: `flespi/interval/gw/calcs/${geofenceCalc.id}/devices/+/+` },
        { topic: `flespi/interval/gw/calcs/${ignitionCalc.id}/devices/+/+` },
      ],
      configuration: {
        type: 'custom-server',
        method: 'POST',
        uri: `${base}/api/webhooks/flespi/intervals`,
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'x-webhook-token', value: FLESPI_ALERTS_WEBHOOK_TOKEN },
        ],
        body:
          '{"payload": %payload%, "event": "%topics[7]%", ' +
          '"device_id": %tonumber(topics[6])%, "calc_id": %tonumber(topics[4])%}',
      },
    },
  ])
  console.log(`✓ webhook: ${webhook.id}`)

  console.log('\nCarga en Vercel (prod y preview):')
  console.log(`  FLESPI_GEOFENCE_CALC_ID=${geofenceCalc.id}`)
  console.log(`  FLESPI_IGNITION_CALC_ID=${ignitionCalc.id}`)
  console.log('  FLESPI_ALERTS_WEBHOOK_TOKEN=<el mismo valor usado aquí>')
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
