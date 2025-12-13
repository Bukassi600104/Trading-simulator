FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for TA-Lib and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the TA-Lib C library (required by the Python TA-Lib package)
RUN wget -qO /tmp/ta-lib.tar.gz "https://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz" \
    && mkdir -p /tmp/ta-lib-src \
    && tar -xzf /tmp/ta-lib.tar.gz -C /tmp/ta-lib-src --strip-components=1 \
    && cd /tmp/ta-lib-src \
    && ./configure --prefix=/usr \
    && make -j1 \
    && make install \
    && cd / \
    && rm -rf /tmp/ta-lib-src /tmp/ta-lib.tar.gz

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
