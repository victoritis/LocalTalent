FROM python:3.10

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Inicia Flower en el puerto 5555
CMD ["celery", "-A", "app.celery", "flower", "--port=5555", "--address=0.0.0.0"]