"""
Testa a detecção automática do bbox do plot + normalização correta dos pontos.
Gera uma imagem de diagnóstico com o bbox desenhado e os pontos marcados.
"""
import sys, os
# Adicionar o diretório 'core' ao path para importar os módulos
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_core_dir = os.path.join(_backend_dir, "core")
sys.path.insert(0, _core_dir)

import cv2
import numpy as np
from plot_detector import detect_plot_bbox
from curve_detector import detect_blue_curve

IMG = r"C:\Users\rno\Downloads\imagem.png"

img = cv2.imread(IMG)
h_img, w_img = img.shape[:2]
print(f"Imagem: {w_img}x{h_img} px")

# ── Testar detecção do bbox ──────────────────────────────────────────────────
bbox = detect_plot_bbox(img)
print(f"\nBBox detectado ({bbox['method']}):")
print(f"  x_left  = {bbox['x_left']}  ({bbox['x_left']/w_img:.3f})")
print(f"  y_top   = {bbox['y_top']}   ({bbox['y_top']/h_img:.3f})")
print(f"  x_right = {bbox['x_right']} ({bbox['x_right']/w_img:.3f})")
print(f"  y_bottom= {bbox['y_bottom']}({bbox['y_bottom']/h_img:.3f})")
print(f"  plot_w  = {bbox['x_right'] - bbox['x_left']} px")
print(f"  plot_h  = {bbox['y_bottom'] - bbox['y_top']} px")

# ── Testar detecção da curva ─────────────────────────────────────────────────
with open(IMG, "rb") as f:
    data = f.read()

result = detect_blue_curve(data, max_points=50, h_min=80, h_max=150, sat_min=50, val_min=20)
print(f"\nCurva detectada:")
print(f"  Pontos  = {result['points_count']}")
print(f"  Pixels  = {result['mask_pixels']}")
print(f"  Erro    = {repr(result['error'])}")
if result["points"]:
    xs = [p["x"] for p in result["points"]]
    ys = [p["y"] for p in result["points"]]
    print(f"  X range = {min(xs):.4f} -> {max(xs):.4f}  (deve cobrir boa parte de [0,1])")
    print(f"  Y range = {min(ys):.4f} -> {max(ys):.4f}  (deve cobrir boa parte de [0,1])")

# ── Gerar imagem de diagnóstico ──────────────────────────────────────────────
debug = img.copy()

# Desenhar bbox do plot
xl, yt, xr, yb = bbox["x_left"], bbox["y_top"], bbox["x_right"], bbox["y_bottom"]
cv2.rectangle(debug, (xl, yt), (xr, yb), (0, 255, 0), 2)
cv2.putText(debug, f"PLOT BBOX ({bbox['method']})", (xl, yt - 6),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

# Desenhar pontos da curva mapeados de volta para pixels
if result["points"]:
    plot_w = xr - xl
    plot_h = yb - yt
    for i, p in enumerate(result["points"]):
        # Reverter normalização: px = xl + x_norm * plot_w
        px = int(xl + p["x"] * plot_w)
        py = int(yt + (1 - p["y"]) * plot_h)
        cv2.circle(debug, (px, py), 4, (0, 0, 255), -1)
        if i % 10 == 0:
            cv2.putText(debug, str(i), (px + 4, py - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)

cv2.imwrite("debug_bbox_auto.png", debug)
print("\nDiagnóstico salvo: debug_bbox_auto.png")
