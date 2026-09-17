"""
Gera uma imagem de diagnóstico para inspecionar o que a máscara HSV detectou.
Salva: mask_debug.png (máscara bruta) e overlay_debug.png (overlay na imagem original)
"""
import cv2
import numpy as np

img_path = r'C:\Users\rno\Downloads\imagem.png'

img = cv2.imread(img_path)
h_img, w_img = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Testar vários parâmetros
configs = [
    ("padrao",  100, 140, 80,  30),
    ("amplo",    80, 150, 50,  20),
    ("muito_amplo", 70, 160, 30, 10),
]

for name, h_min, h_max, sat_min, val_min in configs:
    lower = np.array([h_min, sat_min, val_min], dtype=np.uint8)
    upper = np.array([h_max, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower, upper)
    
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    kernel_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask_clean = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_close)
    mask_clean = cv2.morphologyEx(mask_clean, cv2.MORPH_OPEN, kernel_open)
    
    pixels = int(np.count_nonzero(mask_clean))
    
    # Bounding box dos pixels detectados
    coords = np.where(mask_clean > 0)
    if len(coords[0]) > 0:
        y_min, y_max = coords[0].min(), coords[0].max()
        x_min, x_max = coords[1].min(), coords[1].max()
        bb = f"x:[{x_min}-{x_max}]({x_min/w_img:.2f}-{x_max/w_img:.2f})  y:[{y_min}-{y_max}]({y_min/h_img:.2f}-{y_max/h_img:.2f})"
    else:
        bb = "NENHUM PIXEL"
    
    print(f"[{name}] h=[{h_min}-{h_max}] sat>={sat_min} val>={val_min}  =>  {pixels} pixels  |  {bb}")
    
    # Salvar overlay
    overlay = img.copy()
    overlay[mask_clean > 0] = [0, 255, 0]
    out_path = f'debug_{name}.png'
    cv2.imwrite(out_path, overlay)

print("\nVerifique os arquivos debug_*.png gerados.")
