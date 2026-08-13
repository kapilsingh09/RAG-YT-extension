# Base image
FROM python:3.10-slim

# dir
WORKDIR /app

# Install system dependencies (required for some Python packages like FAISS or sentence-transformers)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# install pip and upgrade it
COPY requirements.txt .

# Install Python dependencies
# Using --no-cache-dir to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
