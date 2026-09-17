"""
analyze_axes_v2.py — diagnóstico correto com dtype int64 para evitar overflow
"""
import sys, os
_core = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core")
sys.path.insert(0, _core)

import cv2
import numpy as np

IMG = r"C:\Users\rno\Downloads\imagem.png"
img = cv2.imread(IMG)
h, w = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Threshold: linhas escuras (grade + bordas)
_, dark = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

# Somar com int64 para evitar overflow
col_sum = dark.astype(np.int64).sum(axis=0)
row_sum = dark.astype(np.int64).sum(axis=1)

print(f"Imagem: {w}x{h}")
print(f"col_sum max: {col_sum.max()} em x={col_sum.argmax()}")
print(f"row_sum max: {row_sum.max()} em y={row_sum.argmax()}")

# Transições na projeção de colunas (mudança brusca de densidade)
print("\n=== TRANSIÇÕES COLUNA (delta > 10% do máximo) ===")
threshold_col = col_sum.max() * 0.10
for x in range(1, w):
    delta = col_sum[x] - col_sum[x-1]
    if abs(delta) > threshold_col:
        print(f"  x={x:4d} ({x/w:.3f}): delta={delta:+.0f}  val={col_sum[x]:.0f}")

print("\n=== TRANSIÇÕES LINHA (delta > 10% do máximo) ===")
threshold_row = row_sum.max() * 0.10
for y in range(1, h):
    delta = row_sum[y] - row_sum[y-1]
    if abs(delta) > threshold_row:
        print(f"  y={y:4d} ({y/h:.3f}): delta={delta:+.0f}  val={row_sum[y]:.0f}")

# Gerar histograma visual simples
print("\n=== TOP 10 colunas mais densas ===")
top_cols = np.argsort(col_sum)[::-1][:10]
for x in top_cols:
    print(f"  x={x:4d} ({x/w:.3f}): {col_sum[x]:.0f}")

print("\n=== TOP 10 linhas mais densas ===")
top_rows = np.argsort(row_sum)[::-1][:10]
for y in top_rows:
    print(f"  y={y:4d} ({y/h:.3f}): {row_sum[y]:.0f}")
