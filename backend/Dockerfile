# Build from the repository root: docker build -f backend/Dockerfile -t inex-api .
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.lock /tmp/requirements.lock
RUN python -m pip install --no-cache-dir -r /tmp/requirements.lock
COPY backend/ ./backend/
ENV PYTHONUNBUFFERED=1 PORT=9000
USER 10001:10001
EXPOSE 9000
CMD ["python", "-m", "backend", "--host", "0.0.0.0"]
