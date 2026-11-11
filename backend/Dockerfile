# Build from the repository root; cloud functions use Linux amd64.
ARG PYTHON_BASE=python:3.12-slim-bookworm
FROM ${PYTHON_BASE}
WORKDIR /app
COPY backend/requirements.lock /tmp/requirements.lock
RUN python -c "import sys; assert sys.version_info[:2] == (3, 12)" \
    && python -m pip install --no-cache-dir -r /tmp/requirements.lock \
    && python -m pip check
COPY backend/ ./backend/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=9000
USER 10001:10001
EXPOSE 9000
CMD ["python", "-m", "backend", "--host", "0.0.0.0"]
