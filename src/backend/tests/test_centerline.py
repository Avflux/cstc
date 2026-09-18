"""
test_centerline.py
==================
Teste autocontido do alinhamento dos pontos detectados.

Gera um grafo log-log sintético (grade + curva azul com marcadores) e verifica
que todos os pontos retornados caem SOBRE a linha azul — isto é, que o pixel
correspondente pertence à máscara azul. Também mede o desvio em relação à
linha de centro real usada para desenhar a curva.

Não depende de imagens externas, então roda em qualquer máquina.
"""
import os
import sys

_core_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core"
)
sys.path.insert(0, _core_dir)

import cv2
import numpy as np

from curve_detector import detect_blue_curve

# Faixa HSV usada pelo detector (defaults)
H_MIN, H_MAX, SAT_MIN, VAL_MIN = 80, 150, 50, 20

# BGR de um azul "navy", como o dos gráficos de excitação
BLUE_BGR = (200, 60, 30)


def _build_synthetic_plot(curve_bgr=BLUE_BGR) -> tuple[np.ndarray, np.ndarray]:
    """Gera o grafo sintético e devolve (imagem, curva_de_referência_em_px)."""
    w, h = 800, 600
    img = np.full((h, w, 3), 255, dtype=np.uint8)

    x_left, x_right = 80, 750
    y_top, y_bottom = 50, 540
    plot_w, plot_h = x_right - x_left, y_bottom - y_top

    # Subdivisões leves da grade log
    for k in range(1, 40):
        x = int(round(x_left + k * plot_w / 40))
        cv2.line(img, (x, y_top), (x, y_bottom), (205, 205, 205), 1)
        y = int(round(y_top + k * plot_h / 40))
        cv2.line(img, (x_left, y), (x_right, y), (205, 205, 205), 1)

    # Décadas (log 0..4) em cinza escuro
    for k in range(5):
        x = int(round(x_left + k * plot_w / 4))
        cv2.line(img, (x, y_top), (x, y_bottom), (90, 90, 90), 1)
        y = int(round(y_top + k * plot_h / 4))
        cv2.line(img, (x_left, y), (x_right, y), (90, 90, 90), 1)

    # Moldura
    cv2.rectangle(img, (x_left, y_top), (x_right, y_bottom), (60, 60, 60), 2)

    # Curva: sobe com inclinação ~1.15 e satura no topo (como na excitação)
    log_io = np.linspace(1.0, 3.5, 200)
    log_u = np.minimum(0.2 + 1.15 * (log_io - 1.0), 3.0)

    px = x_left + (log_io / 4.0) * plot_w
    py = y_bottom - (log_u / 4.0) * plot_h
    curve_px = np.column_stack([px, py])

    pts = np.round(curve_px).astype(np.int32)
    cv2.polylines(img, [pts], False, curve_bgr, 3, cv2.LINE_AA)

    # Marcadores (bolinhas maiores) periódicos, como no gráfico real
    for i in range(0, len(pts), 15):
        cv2.circle(img, tuple(pts[i]), 5, curve_bgr, -1, cv2.LINE_AA)

    return img, curve_px


def _blue_mask(img: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return cv2.inRange(
        hsv,
        np.array([H_MIN, SAT_MIN, VAL_MIN], np.uint8),
        np.array([H_MAX, 255, 255], np.uint8),
    )


def _wrapped_hue_mask(img: np.ndarray, h_min: int, h_max: int) -> np.ndarray:
    """Máscara de matiz que pode cruzar o 0/179 (mesma convenção do backend)."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    if h_min <= h_max:
        return cv2.inRange(
            hsv,
            np.array([h_min, SAT_MIN, VAL_MIN], np.uint8),
            np.array([h_max, 255, 255], np.uint8),
        )
    mask_hi = cv2.inRange(
        hsv,
        np.array([h_min, SAT_MIN, VAL_MIN], np.uint8),
        np.array([179, 255, 255], np.uint8),
    )
    mask_lo = cv2.inRange(
        hsv,
        np.array([0, SAT_MIN, VAL_MIN], np.uint8),
        np.array([h_max, 255, 255], np.uint8),
    )
    return cv2.bitwise_or(mask_hi, mask_lo)


def _distance_to_polyline(points: np.ndarray, poly: np.ndarray) -> np.ndarray:
    """Distância de cada ponto ao segmento mais próximo da polilinha."""
    a = poly[:-1]
    b = poly[1:]
    ab = b - a
    ab_len2 = np.sum(ab * ab, axis=1)
    ab_len2[ab_len2 == 0] = 1e-9

    dists = []
    for p in points:
        t = np.clip(np.sum((p - a) * ab, axis=1) / ab_len2, 0.0, 1.0)
        proj = a + t[:, None] * ab
        dists.append(np.min(np.hypot(proj[:, 0] - p[0], proj[:, 1] - p[1])))
    return np.asarray(dists)


def test_points_lie_on_blue_curve():
    img, curve_px = _build_synthetic_plot()
    ok, buf = cv2.imencode(".png", img)
    assert ok

    result = detect_blue_curve(buf.tobytes(), max_points=60)

    assert result["error"] == "", result["error"]
    assert result["points_count"] > 0

    bbox = result["plot_bbox"]
    xl, yt = bbox["x_left"], bbox["y_top"]
    pw, ph = bbox["width"], bbox["height"]
    mask = _blue_mask(img)

    inside = 0
    pts_px = []
    for p in result["points"]:
        px = xl + p["x"] * pw
        py = yt + (1.0 - p["y"]) * ph
        pts_px.append([px, py])

        xi, yi = int(round(px)), int(round(py))
        if 0 <= yi < img.shape[0] and 0 <= xi < img.shape[1] and mask[yi, xi] > 0:
            inside += 1

    dists = _distance_to_polyline(np.asarray(pts_px), curve_px)
    ratio = inside / result["points_count"]
    mean_dist = float(np.mean(dists))

    # As extremidades medem a borda do marcador/cap (raio ~5px), não o centro do
    # ponto de dados — por isso o desvio do interior é avaliado separadamente.
    interior = dists[2:-2] if dists.size > 4 else dists
    max_interior = float(np.max(interior)) if interior.size else 0.0
    max_end = float(max(dists[0], dists[-1]))

    print(
        f"Pontos: {result['points_count']} | "
        f"sobre o azul: {ratio:.1%} | "
        f"desvio médio: {mean_dist:.2f}px | "
        f"interior máx: {max_interior:.2f}px | extremidade: {max_end:.2f}px"
    )

    # Requisito principal: nenhum ponto pode cair fora da área azul
    assert ratio >= 0.98, f"apenas {ratio:.1%} dos pontos caíram sobre o azul"
    # Linha de centro: pontos do miolo devem estar centrados no traço
    assert max_interior <= 2.0, f"desvio de {max_interior:.2f}px no interior é grande demais"


def test_detects_red_curve_with_wrapped_hue():
    """Uma linha vermelha usa faixa de matiz que cruza o 0/179 (h_min > h_max)."""
    img, _ = _build_synthetic_plot(curve_bgr=(0, 0, 255))  # vermelho
    ok, buf = cv2.imencode(".png", img)
    assert ok

    # vermelho ≈ matiz 0 → ±25 cruza o 0/179 → hMin=155, hMax=25
    result = detect_blue_curve(buf.tobytes(), max_points=40, h_min=155, h_max=25)

    assert result["error"] == "", result["error"]
    assert result["points_count"] == 40

    bbox = result["plot_bbox"]
    mask = _wrapped_hue_mask(img, 155, 25)
    inside = 0
    for p in result["points"]:
        xi = int(round(bbox["x_left"] + p["x"] * bbox["width"]))
        yi = int(round(bbox["y_top"] + (1.0 - p["y"]) * bbox["height"]))
        inside += mask[yi, xi] > 0

    assert inside == result["points_count"], f"{inside}/{result['points_count']} sobre o vermelho"


def test_ignores_distant_blue_noise():
    """Uma mancha azul isolada não pode arrastar a curva nem criar pontos nela."""
    img, _ = _build_synthetic_plot()
    noise = (720, 470)
    cv2.circle(img, noise, 6, BLUE_BGR, -1, cv2.LINE_AA)

    ok, buf = cv2.imencode(".png", img)
    assert ok
    result = detect_blue_curve(buf.tobytes(), max_points=60)

    assert result["error"] == "", result["error"]

    bbox = result["plot_bbox"]
    dists = [
        np.hypot(
            (bbox["x_left"] + p["x"] * bbox["width"]) - noise[0],
            (bbox["y_top"] + (1.0 - p["y"]) * bbox["height"]) - noise[1],
        )
        for p in result["points"]
    ]

    assert min(dists) > 50, f"um ponto caiu sobre a mancha de ruído ({min(dists):.0f}px)"


if __name__ == "__main__":
    test_points_lie_on_blue_curve()
    test_detects_red_curve_with_wrapped_hue()
    test_ignores_distant_blue_noise()
    print("OK — pontos alinhados, cor arbitrária e ruído distante ignorado.")
