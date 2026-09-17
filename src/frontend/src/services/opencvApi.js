/**
 * opencvApi.js
 * ============
 * Camada de comunicação com o backend FastAPI (OpenCV).
 *
 * A URL base é lida da variável de ambiente VITE_BACKEND_URL,
 * com fallback para http://localhost:8000 em desenvolvimento.
 *
 * Para personalizar, crie um arquivo .env.local na raiz do frontend:
 *   VITE_BACKEND_URL=http://localhost:8000
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

/**
 * Envia uma imagem ao backend e recebe os pontos da curva azul detectada.
 *
 * @param {File} imageFile - Arquivo de imagem selecionado pelo usuário
 * @param {object} [options]
 * @param {number} [options.maxPoints=50]   - Número de pontos amostrados
 * @param {number} [options.hMin=100]       - Matiz HSV mínimo do azul
 * @param {number} [options.hMax=140]       - Matiz HSV máximo do azul
 * @param {number} [options.satMin=80]      - Saturação mínima
 * @param {number} [options.valMin=30]      - Brilho mínimo (baixo para navy)
 *
 * @returns {Promise<{
 *   points: Array<{x: number, y: number}>,
 *   points_count: number,
 *   image_width: number,
 *   image_height: number,
 *   mask_pixels: number,
 *   error: string
 * }>}
 *
 * @throws {Error} Se o servidor retornar erro HTTP ou não estiver acessível
 */
export async function detectBlueCurve(imageFile, {
  maxPoints = 50,
  hMin = 80,
  hMax = 150,
  satMin = 50,
  valMin = 20,
} = {}) {
  const form = new FormData()
  form.append('file', imageFile)

  const url = new URL(`${BACKEND_URL}/detect-curve`)
  url.searchParams.set('max_points', maxPoints)
  url.searchParams.set('h_min', hMin)
  url.searchParams.set('h_max', hMax)
  url.searchParams.set('sat_min', satMin)
  url.searchParams.set('val_min', valMin)

  const res = await fetch(url.toString(), {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    const detail = payload?.detail ?? `Erro HTTP ${res.status}`
    throw new Error(detail)
  }

  return res.json()
}

/**
 * Verifica se o backend está acessível.
 * Útil para dar feedback ao usuário antes de tentar o upload.
 *
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}
