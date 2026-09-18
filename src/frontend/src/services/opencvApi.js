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
 * Converte uma cor hexadecimal para HSV no formato do OpenCV.
 *
 * O matiz (H) do OpenCV vai de 0 a 179 (metade do padrão 0–360°).
 *
 * @param {string} hex - Cor no formato "#rrggbb"
 * @returns {{ h: number, s: number, v: number }} H em 0–179, S e V em 0–255
 */
export function hexToHsv(hex) {
  const clean = String(hex).replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
  }
  if (hue < 0) hue += 360

  return {
    h: Math.round(hue / 2),
    s: Math.round((max === 0 ? 0 : delta / max) * 255),
    v: Math.round(max * 255),
  }
}

/**
 * Faixa de matiz (OpenCV) em torno da cor escolhida para a linha.
 *
 * Quando a faixa cruza o 0/179 (cores quentes, como o vermelho), o retorno tem
 * `hMin > hMax` — o backend interpreta isso como uma faixa circular.
 *
 * @param {string} hex - Cor no formato "#rrggbb"
 * @param {number} [tolerance=25] - Meia-largura da faixa, em unidades de matiz
 * @returns {{ hMin: number, hMax: number, saturation: number }} Faixa para o backend
 */
export function hexToHueRange(hex, tolerance = 25) {
  const { h, s } = hexToHsv(hex)
  return {
    hMin: (h - tolerance + 180) % 180,
    hMax: (h + tolerance) % 180,
    saturation: s,
  }
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
