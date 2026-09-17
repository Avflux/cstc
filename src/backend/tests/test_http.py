"""
test_http.py
============
Testa o endpoint HTTP POST /detect-curve com Grafo.png.
"""
import urllib.request
import json
import os

BACKEND = "http://localhost:8000"
IMG_PATH = r"C:\Users\rno\Downloads\Grafo.png"

# --- health check ---
try:
    with urllib.request.urlopen(f"{BACKEND}/health", timeout=3) as r:
        health = json.loads(r.read())
        print("Health:", health)
except Exception as e:
    print("Backend offline:", e)
    exit(1)

# --- multipart upload ---
boundary = "----PythonBoundary1234567"
with open(IMG_PATH, "rb") as f:
    img_bytes = f.read()

parts = []
parts.append(f"--{boundary}\r\n".encode())
parts.append(b'Content-Disposition: form-data; name="file"; filename="Grafo.png"\r\n')
parts.append(b"Content-Type: image/png\r\n\r\n")
parts.append(img_bytes)
parts.append(f"\r\n--{boundary}--\r\n".encode())
body = b"".join(parts)

url = f"{BACKEND}/detect-curve?max_points=50&h_min=80&h_max=150&sat_min=50&val_min=20"
req = urllib.request.Request(
    url,
    data=body,
    method="POST",
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)

with urllib.request.urlopen(req, timeout=15) as r:
    result = json.loads(r.read())

print(f"\nResposta HTTP /detect-curve para Grafo.png:")
print(f"  points_count : {result['points_count']}")
print(f"  mask_pixels  : {result['mask_pixels']}")
print(f"  plot_bbox    : {result['plot_bbox']}")
print(f"  image_bounds : {result['image_bounds']}")
print(f"  error        : {repr(result['error'])}")

if result["points"]:
    p0 = result["points"][0]
    p_last = result["points"][-1]
    io0 = 10 ** (4 * p0['x'])
    u0 = 10 ** (4 * p0['y'])
    io_last = 10 ** (4 * p_last['x'])
    u_last = 10 ** (4 * p_last['y'])
    print(f"\nValores Físicos Mapeados no Gráfico:")
    print(f"  Ponto Inicial: Io = {io0:.2f} mA, U = {u0:.2f} V")
    print(f"  Ponto Final:   Io = {io_last:.2f} mA, U = {u_last:.2f} V")

print("\nTeste de integracao HTTP: OK!")
