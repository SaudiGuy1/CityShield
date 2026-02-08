FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./
COPY enrichment/ ./enrichment/
COPY rules/ ./rules/
COPY mitre_mapping.yml ./

# Create non-root user
RUN useradd -m -u 1000 detector && chown -R detector:detector /app
USER detector

# Run application
CMD ["python", "main.py"]
