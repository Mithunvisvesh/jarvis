# Use lightweight official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install UV for rapid dependency installation
RUN pip install --no-cache-dir uv

# Copy project specification
COPY pyproject.toml uv.lock ./

# Install python dependencies system-wide
RUN uv pip compile pyproject.toml -o requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt && \
    rm requirements.txt

# Copy the rest of the application
COPY . .

# Expose bridge port
EXPOSE 8001

# Production startup
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
