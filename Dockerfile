FROM python:3.11-slim

WORKDIR /code

# Install system dependencies
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

# Download ML models at root level (before user switch) to avoid permission issues
RUN curl -L -o /tmp/cropmodel.pkl "https://huggingface.co/yashnaiduu/agroai-models/resolve/main/cropmodel.pkl"
RUN curl -L -o /tmp/fertilizer_model.pkl "https://huggingface.co/yashnaiduu/agroai-models/resolve/main/fertilizer_model.pkl"
RUN mkdir -p /tmp/model_training && curl -L -o /tmp/model_training/fertilizer_recommendation.csv "https://huggingface.co/yashnaiduu/agroai-models/resolve/main/fertilizer_recommendation.csv"

# Create user
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy source code
COPY --chown=user . $HOME/app

# Move pre-downloaded models into app directory
RUN cp /tmp/cropmodel.pkl $HOME/app/cropmodel.pkl && \
    cp /tmp/fertilizer_model.pkl $HOME/app/fertilizer_model.pkl && \
    mkdir -p $HOME/app/model_training && \
    cp /tmp/model_training/fertilizer_recommendation.csv $HOME/app/model_training/fertilizer_recommendation.csv

# Build the Next.js frontend
WORKDIR $HOME/app/frontend
RUN npm install
RUN npm run build

WORKDIR $HOME/app

EXPOSE 7860

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]
