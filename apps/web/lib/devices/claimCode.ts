import crypto from 'node:crypto'
import { CLAIM_CODE_ALPHABET, CLAIM_CODE_LENGTH } from '@securitycar/shared'

/**
 * Código de activación sin sesgo de módulo (se descartan los bytes fuera de
 * rango). Misma lógica que `scripts/provision-device.mjs`, reusando el
 * alfabeto/longitud de `@securitycar/shared` en vez de redeclararlos — el
 * script CLI los redeclara porque corre fuera del workspace de Next.
 */
export function generateClaimCode(): string {
  const max = Math.floor(256 / CLAIM_CODE_ALPHABET.length) * CLAIM_CODE_ALPHABET.length
  let code = ''
  while (code.length < CLAIM_CODE_LENGTH) {
    for (const byte of crypto.randomBytes(CLAIM_CODE_LENGTH)) {
      if (byte >= max) continue
      code += CLAIM_CODE_ALPHABET[byte % CLAIM_CODE_ALPHABET.length]
      if (code.length === CLAIM_CODE_LENGTH) break
    }
  }
  return code
}
