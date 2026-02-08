FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./

# Create log directory
RUN mkdir -p /data/logs

# Create non-root user
RUN useradd -m -u 1000 simulator && chown -R simulator:simulator /app /data
USER simulator

# Expose port
EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8003/health')"

# Run application
CMD ["python", "app.py"]
