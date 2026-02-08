FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including ansible
RUN apt-get update && apt-get install -y \
    ansible \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./
COPY playbooks_map.yml ./

# Create non-root user
RUN useradd -m -u 1000 responder && chown -R responder:responder /app
USER responder

# Run application
CMD ["python", "main.py"]
