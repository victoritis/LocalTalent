#!/bin/sh
set -e

wait_for_db() {
    echo "Esperando 1 segundos antes de continuar..."
    sleep 1
    echo "Espera completa!"
}

apply_migrations() {

    echo "Verificando estado de migraciones..."
    
    # Verificar si Flask está instalado y si el módulo está disponible
    if ! pip list | grep Flask-Migrate > /dev/null; then
        echo "ADVERTENCIA: Flask-Migrate no está instalado. Instalando..."
        pip install Flask-Migrate
    fi
    
    # Usar el valor de FLASK_APP del archivo .env.local si existe
    if [ -f ".env.local" ] && grep -q "FLASK_APP" .env.local; then
        export $(grep "FLASK_APP" .env.local)
        echo "Usando FLASK_APP=$FLASK_APP de .env.local"
    else
        # Si no, usar el valor predeterminado
        export FLASK_APP=httpApp.py
        echo "Usando FLASK_APP predeterminado: $FLASK_APP"
    fi
    
    # Verificar si el archivo de la aplicación existe
    if [ ! -f "$FLASK_APP" ]; then
        echo "ERROR: El archivo de la aplicación $FLASK_APP no existe."
        echo "Archivos disponibles en el directorio actual:"
        ls -la
        echo "Omitiendo migraciones y continuando..."
        return
    fi
    
    echo "Intentando ejecutar migraciones con FLASK_APP=$FLASK_APP"
    
    # Intentar inicializar la base de datos si es necesario
    # Usamos || true para evitar que el script falle si hay errores
    flask db init || true
    flask db migrate || true
    flask db upgrade || true
    
    echo "Proceso de migración completado (exitoso o con errores)."
    
    # Llamar al comando para crear/actualizar el admin después de las migraciones
    echo "Intentando crear/actualizar administrador por defecto..."
    flask create-admin || echo "Hubo problemas creando/actualizando el admin por defecto, pero continuamos..."
    echo "Creación/actualización de administrador por defecto completada."
}

main() {
    # Cambiamos al directorio de la aplicación al inicio
    cd /application
    echo "Cambiado al directorio: $(pwd)"
    
    wait_for_db
    apply_migrations || echo "Hubo problemas con las migraciones, pero continuamos..."
    echo "Iniciando aplicación con Gunicorn + Eventlet (soporte WebSockets)..."
    
    # Usa Gunicorn con eventlet para soporte de WebSockets/Socket.IO
    exec gunicorn --workers=1 --worker-class=eventlet --bind=0.0.0.0:5000 "httpApp:app"
}

main "$@"
