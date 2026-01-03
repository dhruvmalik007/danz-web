FROM python:3.11-slim

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    ffmpeg \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    libglib2.0-dev \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone and install depth-anything-3 (dependencies already in requirements.txt)
RUN git clone https://github.com/ByteDance-Seed/depth-anything-3 /tmp/depth-anything-3 && \
    cd /tmp/depth-anything-3 && \
    pip install . --no-deps && \
    rm -rf /tmp/depth-anything-3

# Create stub pycolmap module (no ARM64 wheels available)
RUN mkdir -p /usr/local/lib/python3.11/site-packages/pycolmap && \
    echo "# Stub pycolmap module for ARM64 compatibility" > /usr/local/lib/python3.11/site-packages/pycolmap/__init__.py && \
    echo "class Image: pass" >> /usr/local/lib/python3.11/site-packages/pycolmap/__init__.py && \
    echo "class Camera: pass" >> /usr/local/lib/python3.11/site-packages/pycolmap/__init__.py && \
    echo "class Reconstruction: pass" >> /usr/local/lib/python3.11/site-packages/pycolmap/__init__.py

# Copy application code
COPY . .

# Create directories for uploads and outputs
RUN mkdir -p /app/uploads /app/outputs /app/jobs

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
