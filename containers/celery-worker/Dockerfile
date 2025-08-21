# -------- Development --------
FROM python:3.10 AS development

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["celery", "-A", "app.celery", "worker", "-Ofair", "--loglevel=INFO", "--autoscale=8,4", "-Q", "jwtoken,cve_load,cpe_load,match_load", "-n", "worker-1"]

# -------- Production --------
FROM python:3.10 AS production

COPY /backend/application /app

WORKDIR /app

COPY /backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["celery", "-A", "app.celery", "worker", "-Ofair", "--loglevel=INFO", "--autoscale=8,4", "-Q", "jwtoken,cve_load,cpe_load,match_load", "-n", "worker-1"]
