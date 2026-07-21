#!/usr/bin/env node
/**
 * Provisiona un equipo GPS y genera su código de activación.
 *
 * Este es el paso que hacemos nosotros al instalar el equipo. El cliente nunca
 * declara un dispositivo: solo reclama uno ya provisionado con el código que
 * imprimimos aquí. Sin este paso, no hay forma de dar de alta un vehículo.
 *
 * Uso:
 *   node scripts/provision-device.mjs --imei 864895030123456 [--iccid 8934...]
 *   node scripts/provision-device.mjs --imei ... --flespi-id 123456   (sin buscar en Flespi)
 *
 * Variables de entorno requeridas:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FLESPI_TOKEN
 */
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 8

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--')) continue
    args[argv[i].slice(2)] = argv[i + 1]
  }
  return args
}

/** Código sin sesgo de módulo: se descartan los bytes fuera de rango. */
function generateClaimCode() {
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  let code = ''
  while (code.length < CODE_LENGTH) {
    for (const byte of crypto.randomBytes(CODE_LENGTH)) {
      if (byte >= max) continue
      code += ALPHABET[byte % ALPHABET.length]
      if (code.length === CODE_LENGTH) break
    }
  }
  return code
}

function format(code) {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/**
 * Busca el device en Flespi por su ident (el IMEI). Se listan todos y se filtra
 * en local: la sintaxis de `filter` de Flespi es delicada y el número de
 * equipos en esta fase es pequeño.
 */
async function findFlespiDevice(imei, token) {
  const res = await fetch('https://flespi.io/gw/devices/all?fields=id,name,configuration', {
    headers: { Authorization: `FlespiToken ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Flespi ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  const { result = [] } = await res.json()
  return result.find(d => String(d.configuration?.ident ?? '').trim() === imei) ?? null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const imei = String(args.imei ?? '').trim()

  if (!/^\d{15}$/.test(imei)) {
    console.error('Error: --imei debe ser un IMEI de 15 dígitos.')
    process.exit(1)
  }

  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FLESPI_TOKEN } = process.env
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  let flespiDeviceId = args['flespi-id'] ? Number(args['flespi-id']) : null

  if (!flespiDeviceId) {
    if (!FLESPI_TOKEN) {
      console.error('Error: falta FLESPI_TOKEN (o pasa --flespi-id para omitir la búsqueda).')
      process.exit(1)
    }
    console.log(`Buscando IMEI ${imei} en Flespi…`)
    const device = await findFlespiDevice(imei, FLESPI_TOKEN)
    if (!device) {
      console.error(
        `Error: no hay ningún dispositivo con ident ${imei} en Flespi.\n` +
          'Dalo de alta primero en el panel de Flespi.'
      )
      process.exit(1)
    }
    flespiDeviceId = device.id
    console.log(`  → device #${device.id} (${device.name ?? 'sin nombre'})`)
  }

  const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const claimCode = generateClaimCode()
  const { data, error } = await db
    .from('devices')
    .insert({
      imei,
      flespi_device_id: flespiDeviceId,
      sim_iccid: args.iccid ?? null,
      status: 'provisioned',
      claim_code: claimCode,
    })
    .select('id, imei, flespi_device_id')
    .single()

  if (error) {
    if (error.code === '23505') {
      console.error(`Error: el IMEI ${imei} o el device de Flespi ya está provisionado.`)
      process.exit(1)
    }
    console.error('Error al insertar el dispositivo:', error.message)
    process.exit(1)
  }

  console.log('\n─────────────────────────────────')
  console.log(' Dispositivo provisionado')
  console.log('─────────────────────────────────')
  console.log(` IMEI              ${data.imei}`)
  console.log(` Flespi device id  ${data.flespi_device_id}`)
  console.log(` Código activación ${format(claimCode)}`)
  console.log('─────────────────────────────────')
  console.log(' Entrega el código al cliente. Es de un solo uso.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
