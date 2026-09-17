"""
plot_detector.py
================
Detecção automática da área de plotagem (bounding box) e cálculo
da calibração automática dos limites da imagem no espaço log-log.
"""

import cv2
import numpy as np


def detect_plot_bbox(img: np.ndarray) -> dict:
    """
    Detecta automaticamente o retângulo delimitador da grade do grafo (eixos X e Y).

    Retorno
    -------
    dict com:
        - "x_left", "y_top", "x_right", "y_bottom" : int (pixels da grade)
        - "plot_w", "plot_h" : int
        - "image_bounds" : dict { kMin, kMax, uMin, uMax } calibrado
        - "ok" : bool
        - "method" : str
    """
    h_img, w_img = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)

    # Detectar linhas verticais (comprimento >= 25% da altura)
    vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(15, int(h_img * 0.25))))
    v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vk)
    col_v = (v_lines > 0).sum(axis=0)

    # Detectar linhas horizontais (comprimento >= 25% da largura)
    hk = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, int(w_img * 0.25)), 1))
    h_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, hk)
    row_h = (h_lines > 0).sum(axis=1)

    # Ignorar margem extrema se houver moldura externa (primeiros/últimos 2%)
    margin_w = int(w_img * 0.02)
    margin_h = int(h_img * 0.02)

    v_indices = np.where(col_v > h_img * 0.20)[0]
    v_candidates = [int(x) for x in v_indices if margin_w <= x <= (w_img - margin_w)]

    h_indices = np.where(row_h > w_img * 0.20)[0]
    h_candidates = [int(y) for y in h_indices if margin_h <= y <= (h_img - margin_h)]

    if len(v_candidates) >= 2 and len(h_candidates) >= 2:
        x_left = v_candidates[0]
        x_right = v_candidates[-1]
        y_top = h_candidates[0]
        y_bottom = h_candidates[-1]
        method = "grid_morphology"
        ok = True
    else:
        # Fallback padrão calibrado para gráficos de 4 décadas
        x_left = int(w_img * 0.086)
        x_right = int(w_img * 0.956)
        y_top = int(h_img * 0.069)
        y_bottom = int(h_img * 0.920)
        method = "fallback"
        ok = False

    plot_w = max(1, x_right - x_left)
    plot_h = max(1, y_bottom - y_top)

    # Cálculo da calibração para o enquadramento perfeito no frontend
    # A grade física representa de 1 a 10000 (4 décadas) tanto em Io quanto em U
    log_k_min = 0.0  # log10(1)
    log_k_max = 4.0  # log10(10000)
    log_u_min = 0.0  # log10(1)
    log_u_max = 4.0  # log10(10000)

    img_log_k_min = log_k_min - (x_left / plot_w) * (log_k_max - log_k_min)
    img_log_k_max = log_k_min + ((w_img - x_left) / plot_w) * (log_k_max - log_k_min)

    img_log_u_min = log_u_min - ((h_img - y_bottom) / plot_h) * (log_u_max - log_u_min)
    img_log_u_max = log_u_max + (y_top / plot_h) * (log_u_max - log_u_min)

    image_bounds = {
        "kMin": float(10 ** img_log_k_min),
        "kMax": float(10 ** img_log_k_max),
        "uMin": float(10 ** img_log_u_min),
        "uMax": float(10 ** img_log_u_max),
    }

    return {
        "x_left": x_left,
        "y_top": y_top,
        "x_right": x_right,
        "y_bottom": y_bottom,
        "plot_w": plot_w,
        "plot_h": plot_h,
        "image_bounds": image_bounds,
        "ok": ok,
        "method": method,
    }
