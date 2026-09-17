# Backend — GrafoCurva OpenCV API

Servidor Python que detecta automaticamente a linha azul em imagens de grafos
de curva de excitação (log-log U(V) × Io(mA)) usando OpenCV.

---

## Tecnologias

| Biblioteca | Função |
|---|---|
| **FastAPI** | Framework REST assíncrono com Swagger UI automático |
| **Uvicorn** | Servidor ASGI de alta performance |
| **OpenCV** (`cv2`) | Processamento de imagem: filtro HSV, morfologia, contornos |
| **NumPy** | Operações vetorizadas sobre arrays de pixels |

---

## Pré-requisitos

- Python 3.10 ou superior
- pip

---

## Instalação

```bash
# 1. Entre no diretório do módulo
cd apps/modules/grafo_curva

# 2. (Recomendado) Crie um ambiente virtual
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# 3. Instale as dependências
pip install -r requirements.txt
```

---

## Execução

```bash
# A partir de apps/modules/grafo_curva/src/backend/
cd src/backend
python main.py
```

O servidor inicia em **`http://localhost:8000`** com hot-reload ativado.

> **Swagger UI** (documentação interativa): http://localhost:8000/docs  
> **ReDoc**: http://localhost:8000/redoc

---

## Endpoints

### `GET /health`

Verifica se o servidor está ativo.

**Resposta:**
```json
{ "status": "ok", "service": "GrafoCurva OpenCV API" }
```

---

### `POST /detect-curve`

Recebe uma imagem e retorna os pontos da curva azul detectada.

**Body:** `multipart/form-data`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `file` | file | Imagem do grafo (PNG, JPG, BMP…) |

**Parâmetros de query (opcionais):**

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| `max_points` | `50` | Número máximo de pontos retornados (5–500) |
| `h_min` | `100` | Matiz HSV mínimo do azul (0–179) |
| `h_max` | `140` | Matiz HSV máximo do azul (0–179) |
| `sat_min` | `80` | Saturação mínima (0–255) |
| `val_min` | `30` | Brilho mínimo (0–255) — use baixo para azul escuro/navy |

**Exemplo de chamada (curl):**
```bash
curl -X POST "http://localhost:8000/detect-curve?max_points=50" \
     -F "file=@minha_curva.png"
```

**Resposta de sucesso (200):**
```json
{
  "points": [
    { "x": 0.082, "y": 0.121 },
    { "x": 0.115, "y": 0.198 },
    ...
    { "x": 0.891, "y": 0.834 }
  ],
  "points_count": 50,
  "image_width": 1253,
  "image_height": 876,
  "mask_pixels": 4320,
  "error": ""
}
```

**Convenção das coordenadas normalizadas:**

```
y=1 (U máximo)
  ┌──────────────┐
  │    curva     │
  │  detectada   │
  └──────────────┘
x=0             x=1
(Io mínimo)  (Io máximo)
y=0 (U mínimo)
```

- `x ∈ [0, 1]` → posição horizontal (Io, da esquerda para a direita)
- `y ∈ [0, 1]` → posição vertical invertida (U, de baixo para cima)

**Resposta de erro (422):**
```json
{
  "detail": "Detecção falhou: Nenhum pixel azul encontrado (h_min=100, h_max=140). Ajuste os parâmetros de cor ou verifique a imagem."
}
```

---

## Como funciona o algoritmo

```mermaid
flowchart TD
    A[Imagem recebida] --> B[Decodificar com OpenCV]
    B --> C[Detectar bbox da grade (eixos X/Y)]
    C --> D[Converter BGR → HSV]
    D --> E["Máscara: inRange(h_min, h_max, sat_min, val_min)"]
    E --> F[Morfologia CLOSE + OPEN]
    F --> G[Manter componentes relevantes — descartar ruído]
    G --> H[Centro de cada trecho azul por coluna — linha de centro]
    H --> I[Interpolar lacunas + suavizar]
    I --> J[Amostrar N pontos com interpolação sub-pixel]
    J --> K[Normalizar para 0~1]
    K --> L[Retornar JSON com pontos]
```

---

## Alinhamento dos pontos

Os pontos são extraídos da **linha de centro** do traço azul: em cada coluna de
pixels, o detector toma o ponto médio do trecho contínuo de azul (em vez dos
pixels do contorno). Isso evita o viés sistemático que empurrava os pontos para
a borda da linha em trechos inclinados e sobre os marcadores.

O trecho de azul mais coerente com a coluna anterior é escolhido, o que também
faz o detector seguir uma única curva mesmo com marcadores grandes ou pequenas
falhas no traço.

---

## Ajuste da faixa de azul (HSV)

Se a linha não for detectada corretamente, ajuste `h_min` e `h_max`:

| Tom de azul | h_min | h_max | sat_min | val_min |
|---|---|---|---|---|
| **Navy / azul escuro** *(padrão)* | 100 | 140 | 80 | 30 |
| Azul padrão (caneta) | 100 | 130 | 100 | 80 |
| Azul ciano | 85 | 110 | 100 | 80 |
| Azul elétrico/brilhante | 105 | 125 | 150 | 100 |
| Azul royal | 110 | 135 | 80 | 50 |

> **Dica:** Para inspecionar o HSV de um pixel da imagem, use a ferramenta
> de seleção de cor do GIMP, Photoshop ou Paint.NET e converta RGB → HSV.
> No OpenCV, o matiz (H) vai de 0 a 179 (metade do padrão 0–360°).

---

## Estrutura dos arquivos

```
grafo_curva/
├── requirements.txt          ← dependências Python
├── BACKEND.md                ← esta documentação
└── src/
    └── backend/
        ├── main.py           ← servidor FastAPI
        └── curve_detector.py ← lógica OpenCV
```

---

## CORS e segurança

Em desenvolvimento, o backend aceita requisições de qualquer origem (`allow_origins=["*"]`).
Para produção, edite `main.py` e restrinja para o domínio do frontend:

```python
allow_origins=["https://meu-dominio.com"]
```
