FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tcpdump \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY logger.py .

CMD ["python3", "-u", "logger.py"]
