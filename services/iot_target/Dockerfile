FROM python:3.11-slim

RUN pip install --no-cache-dir fastapi uvicorn

WORKDIR /app
COPY iot_target.py .

EXPOSE 8080 1883

CMD ["python3", "-u", "iot_target.py"]
