# -------- Development --------
FROM python:3.10 AS development

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["celery", "-A", "app.celery", "beat", "--loglevel=INFO"]

# -------- Production --------
FROM python:3.10 AS production

COPY /backend/application /app

WORKDIR /app

COPY /backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["celery", "-A", "app.celery", "beat", "--loglevel=INFO"]
