"""
GrafoCurva – Backend OpenCV API
================================
Servidor FastAPI para detecção automática da linha azul em imagens
de curvas de excitação (grafo log-log U(V) × Io(mA)).

Execução:
    python main.py
    # ou
    uvicorn main:app --reload --port 8000

Documentação interativa (Swagger UI):
    http://localhost:8000/docs
"""

import os
import sys

import uvicorn
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

if __package__ in (None, ""):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from core.curve_detector import detect_blue_curve
else:
    from apps.modules.grafo_curva.src.backend.core.curve_detector import (
        detect_blue_curve,
    )

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GrafoCurva OpenCV API",
    description=(
        "Detecção automática de curvas traçadas em azul em imagens "
        "de grafos de excitação (log-log). Retorna pontos normalizados "
        "[0,1] prontos para mapeamento no espaço U(V) × Io(mA)."
    ),
    version="1.0.0",
)

# CORS – permite chamadas do frontend Vite (localhost:5173) em dev.
# Ajuste `allow_origins` para restringir em produção.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", summary="Health check", tags=["Sistema"])
def health():
    """Verifica se o servidor está ativo."""
    return {"status": "ok", "service": "GrafoCurva OpenCV API"}


@app.post("/detect-curve", summary="Detectar linha azul na imagem", tags=["Detecção"])
async def detect_curve(
    file: UploadFile = File(..., description="Imagem do grafo (PNG, JPG, BMP…)"),
    max_points: int = Query(
        50, ge=5, le=500, description="Número máximo de pontos amostrados"
    ),
    h_min: int = Query(
        80, ge=0, le=179, description="Matiz HSV mínimo (OpenCV: 0-179)"
    ),
    h_max: int = Query(
        150, ge=0, le=179, description="Matiz HSV máximo (OpenCV: 0-179)"
    ),
    sat_min: int = Query(50, ge=0, le=255, description="Saturação HSV mínima"),
    val_min: int = Query(20, ge=0, le=255, description="Brilho HSV mínimo"),
):
    """
    Recebe uma imagem via multipart/form-data e retorna os pontos da curva
    traçada em azul, normalizados no intervalo [0, 1].

    - **x** → posição horizontal normalizada (0 = esquerda / menor Io, 1 = direita / maior Io)
    - **y** → posição vertical normalizada (0 = baixo / menor U, 1 = cima / maior U)

    Os pontos são ordenados da esquerda para a direita (ordem crescente de Io).
    """
    # Validar tipo de arquivo
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo inválido: '{file.content_type}'. Envie uma imagem (PNG, JPG, etc.).",
        )

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Arquivo de imagem está vazio.")

    result = detect_blue_curve(
        image_bytes=contents,
        max_points=max_points,
        h_min=h_min,
        h_max=h_max,
        sat_min=sat_min,
        val_min=val_min,
    )

    if "error" in result and not result.get("points"):
        raise HTTPException(
            status_code=422,
            detail=f"Detecção falhou: {result['error']}. "
            "Verifique se a imagem contém uma linha na cor azul e ajuste os parâmetros h_min/h_max.",
        )

    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
