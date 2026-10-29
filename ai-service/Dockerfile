FROM python:3.12-slim-bookworm

# Trae uv desde su imagen oficial
COPY --from=ghcr.io/astral-sh/uv:0.10.11 /uv /bin/

# libmagic (python-magic) y librer�as de OpenCV que necesita ultralytics
RUN apt-get update && apt-get install -y --no-install-recommends libmagic1 libglib2.0-0 libgl1     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala las dependencias primero para aprovechar la caché de capas
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

# Copia el código y usa el entorno virtual creado por uv
COPY . .
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "8000"]