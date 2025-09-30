FROM python:3.12-alpine
WORKDIR /app
RUN pip install --no-cache-dir docker
COPY index.py .
ENV ENV_PATH=/workspace/.env
CMD ["python", "index.py"]
