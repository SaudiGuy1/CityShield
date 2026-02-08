FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./
COPY scenarios/ ./scenarios/

# Create non-root user
RUN useradd -m -u 1000 runner && chown -R runner:runner /app
USER runner

# Run application
CMD ["python", "main.py"]
