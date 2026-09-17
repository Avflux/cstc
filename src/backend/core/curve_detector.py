"""
curve_detector.py
=================
Lógica central de detecção de curva azul usando OpenCV com auto-calibração.

A curva é obtida pela *linha de centro* do traço azul: para cada coluna de
pixels, usa-se o ponto médio do trecho contínuo de azul (e não os pixels do
contorno), garantindo que os pontos fiquem centrados no traço.
"""

import cv2
import numpy as np

try:
    from core.plot_detector import detect_plot_bbox
except ImportError:
    from plot_detector import detect_plot_bbox


def _main_curve_mask(
    mask: np.ndarray, bridge_ratio: float = 0.02, min_bridge: int = 5
) -> np.ndarray:
    """
    Isola a curva principal, descartando ruídos soltos.

    Uma dilatação leve une marcadores e pequenas falhas do traço; em seguida
    mantém-se apenas o maior componente conexo. Manchas azuis distantes (ruído,
    legendas, elementos da imagem) ficam de fora, evitando que o rastreamento
    "pule" para elas.
    """
    h, w = mask.shape
    k = max(min_bridge, int(min(h, w) * bridge_ratio)) | 1  # kernel ímpar
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    bridged = cv2.dilate(mask, kernel)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(bridged, connectivity=8)
    if num <= 1:
        return mask

    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(labels == main, mask, 0).astype(np.uint8)


def _track_centerline(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Extrai a linha de centro do traço azul, coluna a coluna.

    Para cada coluna, cada trecho contínuo de pixels azuis (run) é resumido
    pelo seu ponto médio vertical. Escolhe-se o trecho mais coerente com a
    coluna anterior (continuidade), mantendo o ponto exatamente no meio da
    espessura do traço — inclusive em trechos inclinados e nos marcadores —
    sem o viés que a mediana dos pixels de contorno introduz.
    """
    _, w = mask.shape
    xs: list[int] = []
    ys: list[float] = []
    prev: float | None = None

    for x in range(w):
        col = np.flatnonzero(mask[:, x])
        if col.size == 0:
            continue

        runs = np.split(col, np.where(np.diff(col) > 1)[0] + 1)
        centers = np.array([(r[0] + r[-1]) / 2.0 for r in runs])

        if prev is None:
            idx = int(np.argmax([r.size for r in runs]))
        else:
            idx = int(np.argmin(np.abs(centers - prev)))

        prev = float(centers[idx])
        xs.append(x)
        ys.append(prev)

    return np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)


def _fill_and_smooth(
    xs: np.ndarray,
    ys: np.ndarray,
    max_gap: int,
    window: int = 5,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Mantém o maior trecho contínuo, interpola lacunas curtas e suaviza.

    Lacunas maiores que `max_gap` colunas não são interpoladas (evitariam criar
    pontos em regiões sem traço); nesse caso só o trecho contínuo mais longo é
    aproveitado.
    """
    if xs.size == 0:
        return xs, ys

    breaks = np.where(np.diff(xs) > max_gap)[0]
    segments = np.split(np.arange(xs.size), breaks + 1)
    longest = max(segments, key=lambda s: xs[s[-1]] - xs[s[0]])
    xs, ys = xs[longest], ys[longest]

    full_x = np.arange(int(xs[0]), int(xs[-1]) + 1, dtype=float)
    filled = np.interp(full_x, xs, ys)

    if window > 1 and filled.size >= window:
        kernel = np.ones(window, dtype=float) / window
        pad = window // 2
        padded = np.pad(filled, pad, mode="edge")
        filled = np.convolve(padded, kernel, mode="valid")

    return full_x, filled


def detect_blue_curve(
    image_bytes: bytes,
    max_points: int = 50,
    h_min: int = 80,
    h_max: int = 150,
    sat_min: int = 50,
    val_min: int = 20,
) -> dict:
    """
    Detecta a linha azul principal em uma imagem de grafo, com calibração e
    normalização automáticas com base na detecção da grade de eixos X e Y.
    """
    # 1. Decodificar imagem
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        return {
            "points": [],
            "points_count": 0,
            "image_width": 0,
            "image_height": 0,
            "mask_pixels": 0,
            "plot_bbox": None,
            "image_bounds": None,
            "error": "Falha ao decodificar a imagem.",
        }

    h_img, w_img = img.shape[:2]

    # 2. Detectar limites da grade e calcular calibração automática
    grid_info = detect_plot_bbox(img)
    x_l = grid_info["x_left"]
    y_t = grid_info["y_top"]
    x_r = grid_info["x_right"]
    y_b = grid_info["y_bottom"]
    plot_w = grid_info["plot_w"]
    plot_h = grid_info["plot_h"]

    # 3. Converter para HSV e extrair a curva azul dentro da grade
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower_blue = np.array([h_min, sat_min, val_min], dtype=np.uint8)
    upper_blue = np.array([h_max, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_blue, upper_blue)

    # Recortar máscara para o interior da grade (evita ruídos fora do gráfico)
    mask_grid = mask[y_t:y_b, x_l:x_r].copy()
    mask_pixels = int(np.count_nonzero(mask_grid))

    if mask_pixels == 0:
        return {
            "points": [],
            "points_count": 0,
            "image_width": w_img,
            "image_height": h_img,
            "mask_pixels": 0,
            "plot_bbox": grid_info,
            "image_bounds": grid_info["image_bounds"],
            "error": "Nenhum pixel azul encontrado dentro da grade do gráfico.",
        }

    # 4. Operações morfológicas: fechar pequenas falhas do traço e remover ruído
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask_clean = cv2.morphologyEx(mask_grid, cv2.MORPH_CLOSE, k_close)
    mask_clean = cv2.morphologyEx(mask_clean, cv2.MORPH_OPEN, k_open)

    # 5. Isolar a curva principal (maior componente), ignorando ruídos soltos
    mask_curve = _main_curve_mask(mask_clean)

    # 6. Linha de centro por coluna.
    #    Usar o centro de cada trecho contínuo de azul (e não os pixels de
    #    contorno) mantém cada ponto no meio da espessura do traço, evitando o
    #    desvio sistemático em direção à borda da linha azul.
    xs, ys = _track_centerline(mask_curve)

    if xs.size < 2:
        return {
            "points": [],
            "points_count": 0,
            "image_width": w_img,
            "image_height": h_img,
            "mask_pixels": mask_pixels,
            "plot_bbox": grid_info,
            "image_bounds": grid_info["image_bounds"],
            "error": "Traço azul curto ou fragmentado demais para extrair a curva.",
        }

    # 7. Manter o maior trecho contínuo, interpolar lacunas curtas e suavizar
    max_gap = max(3, int(plot_w * 0.05))
    xs, ys = _fill_and_smooth(xs, ys, max_gap=max_gap, window=5)

    # 8. Amostragem uniforme com interpolação sub-pixel
    n_pts = xs.size
    if n_pts > max_points:
        idx = np.linspace(0, n_pts - 1, max_points)
        grid = np.arange(n_pts, dtype=float)
        sx = np.interp(idx, grid, xs)
        sy = np.interp(idx, grid, ys)
    else:
        sx, sy = xs, ys

    # 9. Normalização em relação aos limites exatos da grade [0, 1]
    # x = 0 (Io=1), x = 1 (Io=10000)
    # y = 0 (U=1),  y = 1 (U=10000)
    points_normalized = [
        {
            "x": float(np.clip(xv / plot_w, 0.0, 1.0)),
            "y": float(np.clip(1.0 - (yv / plot_h), 0.0, 1.0)),
        }
        for xv, yv in zip(sx, sy)
    ]

    return {
        "points": points_normalized,
        "points_count": len(points_normalized),
        "image_width": w_img,
        "image_height": h_img,
        "mask_pixels": mask_pixels,
        "plot_bbox": {
            "x_left": x_l,
            "y_top": y_t,
            "x_right": x_r,
            "y_bottom": y_b,
            "width": plot_w,
            "height": plot_h,
            "method": grid_info["method"],
        },
        "image_bounds": grid_info["image_bounds"],
        "error": "",
    }
