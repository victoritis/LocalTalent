# Dockerfile
FROM python:3-alpine AS base

# Instalar curl para los healthchecks
RUN apk add --no-cache curl

FROM base AS common
FROM common AS development

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /application

# Copia el archivo de requerimientos (si tienes dependencias)
# Copia el código de la aplicación
COPY . .

RUN pip install uv

# Instala las dependencias de Python
RUN uv pip install --system -r requirements.txt

# Copia el código de la aplicación
COPY . .

# Expone el puerto 5000
EXPOSE 5000

# Ejecuta la aplicación
CMD ["python", "-u", "httpApp.py"]

FROM common AS production

COPY . .

RUN pip install uv

# Instala las dependencias de Python
RUN uv pip install --system -r requirements.txt

# Instala Gunicorn para servidor en producción
RUN pip install gunicorn

# # Asegúrate de que el entrypoint.sh sea ejecutable
RUN chmod +x ./entrypoint.sh

# Establece el entrypoint
ENTRYPOINT ["./entrypoint.sh"]