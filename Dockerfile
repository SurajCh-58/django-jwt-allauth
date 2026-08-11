# ==========================================
# Stage 1: Build dependencies
# ==========================================

FROM python:3.12-slim-bullseye AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System dependencies required to build Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt


# ==========================================
# Stage 2: Application
# ==========================================

FROM python:3.12-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Runtime dependency for PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*


# ==========================================
# Create non-root user
# matching host UID/GID
# ==========================================

ARG UID=1000
ARG GID=1000

RUN groupadd --gid ${GID} django && \
    useradd --uid ${UID} --gid ${GID} --create-home django


WORKDIR /app

# Copy Python dependencies from builder stage
COPY --from=builder /install /usr/local

# Copy project files
COPY --chown=django:django . /app

# Django directories
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R django:django /app/staticfiles /app/media

# Run application as non-root user
USER django

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "AuthProject.wsgi:application"]