---
title: AgroAI
emoji: 🌾
colorFrom: green
colorTo: yellow
sdk: docker
pinned: false
layout: wide
---
# AgroAI

AgroAI is a comprehensive, AI-driven agricultural assistant built to provide farmers and agricultural professionals with easy access to actionable, data-backed insights. Combining supervised machine learning with modern generative AI, AgroAI serves as a localized, intelligent companion for optimizing farm yields and answering complex agricultural questions.

## Key Features

*   **Intelligent Crop & Fertilizer Recommendations**
    Utilizes trained Random Forest classifiers to predict the optimal crops to plant and the best fertilizers to apply. Predictions are based on specific soil metrics (Nitrogen, Phosphorus, Potassium) and environmental conditions like temperature and humidity.
*   **Voice-Enabled Assistant**
    Features an accessible, conversational voice bot that allows farmers to interact with the AI naturally, removing the barrier of complex technical interfaces.
*   **RAG Knowledge Engine**
    A custom Retrieval-Augmented Generation (RAG) pipeline powered by LangChain and ChromaDB. It queries specialized local agricultural documentation to provide accurate, context-aware answers to complex farming questions, eliminating the risk of LLM hallucinations.
*   **Modern Web Interface**
    A responsive Next.js frontend that allows users to easily input soil data, view recommendations, and chat with the AI seamlessly.

## Technology Stack

*   **Backend:** Python, FastAPI
*   **Frontend:** Next.js, React, TypeScript, TailwindCSS
*   **AI & Machine Learning:** Scikit-Learn, Random Forest, LangChain, ChromaDB
*   **Deployment:** Docker Ready

## Project Structure

- `api.py` - Main FastAPI backend server handling model inference and routes.
- `voicebotadvanced.py` - Core logic for the voice interactions and audio processing.
- `rag_engine.py` - RAG pipeline for knowledge retrieval and LLM integration.
- `frontend/` - Next.js UI application for user interaction.
- `model_training/` - Training scripts and raw CSV datasets used to generate the `.pkl` models.
- `rag_knowledge/` - Source documentation used by the ChromaDB vector store.

## Getting Started

### Prerequisites
* Python 3.11+
* Node.js 18+
* API keys for the LLM configured in a `.env` file (see `.env.example`).

### Running Locally

1. **Start the Backend**
   Install the necessary Python dependencies and start the FastAPI server:
   ```bash
   pip install -r requirements.txt
   uvicorn api:app --reload --port 7860
   ```

2. **Start the Frontend**
   Navigate to the frontend directory, install node modules, and start the development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`.

## Architecture Note

The project is structured to separate the training environment from the production environment. The machine learning models (`cropmodel.pkl` and `fertilizer_model.pkl`) are pre-trained and loaded into memory by the FastAPI backend for fast inference. The standalone training scripts remain in `model_training/` for future retraining cycles but are safely ignored during Docker deployments.
