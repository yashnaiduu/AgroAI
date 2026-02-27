FROM python:3.11-slim

# Set working directory
WORKDIR /code

# Install system dependencies (needed for audio/whisper, general compilation, and Node 20.x)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    build-essential \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install Python requirements
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Create a user to run the app (Hugging Face requirement for security)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy the rest of the code and models
COPY --chown=user . $HOME/app

# Build the Next.js frontend
WORKDIR $HOME/app/frontend
RUN npm install
RUN npm run build

# Switch back to the main app directory
WORKDIR $HOME/app

# Expose the standard Hugging Face port
EXPOSE 7860

# Run FastAPI on 0.0.0.0:7860
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
