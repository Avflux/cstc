"""
curve_detector.py
=================
Lógica central de detecção de curva azul usando OpenCV com auto-calibração.
"""

import cv2
import numpy as np

try:
    from core.plot_detector import detect_plot_bbox
except ImportError:
    from plot_detector import detect_plot_bbox


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

    # 4. Operações morfológicas para unir traços e remover ruído
    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask_clean = cv2.morphologyEx(mask_grid, cv2.MORPH_CLOSE, k_close)

    # 5. Encontrar contorno principal
    contours, _ = cv2.findContours(mask_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return {
            "points": [],
            "points_count": 0,
            "image_width": w_img,
            "image_height": h_img,
            "mask_pixels": mask_pixels,
            "plot_bbox": grid_info,
            "image_bounds": grid_info["image_bounds"],
            "error": "Nenhum contorno identificado.",
        }

    main_contour = max(contours, key=cv2.contourArea).reshape(-1, 2)
    sorted_pts = main_contour[np.argsort(main_contour[:, 0])]

    # 6. Suavização (mediana por coordenada X)
    unique_x = np.unique(sorted_pts[:, 0])
    smoothed = []
    for xv in unique_x:
        ys = sorted_pts[sorted_pts[:, 0] == xv, 1]
        smoothed.append([float(xv), float(np.median(ys))])
    smoothed = np.array(smoothed)

    # 7. Amostragem uniforme
    n_pts = len(smoothed)
    if n_pts > max_points:
        indices = np.linspace(0, n_pts - 1, max_points, dtype=int)
        sampled = smoothed[indices]
    else:
        sampled = smoothed

    # 8. Normalização em relação aos limites exatos da grade [0, 1]
    # x = 0 (Io=1), x = 1 (Io=10000)
    # y = 0 (U=1),  y = 1 (U=10000)
    points_normalized = [
        {
            "x": float(np.clip(pt[0] / plot_w, 0.0, 1.0)),
            "y": float(np.clip(1.0 - (pt[1] / plot_h), 0.0, 1.0)),
        }
        for pt in sampled
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
