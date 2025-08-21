# api_routes.py
from flask import request, jsonify
from app.error import bp
from sqlalchemy.exc import SQLAlchemyError

from app.logger_config import logger
logger = logger.getChild('error')  

@bp.route('/api/v1/log-error', methods=['POST'])
def log_error():
    """
    - Recibe y registra un mensaje de error enviado desde el frontend.
    - Valida que el mensaje de error esté presente en la solicitud.
    - Registra el error en los logs del sistema.
    - Retorna confirmación o error según corresponda.
    """
    try:
        # Obtener los datos de la solicitud
        data = request.get_json()
        logger.info(f"Solicitud de registro de error recibida: {data}")
        
        # Verificar que se haya proporcionado un mensaje de error
        error_message = data.get('error_message')
        if not error_message:
            logger.warning("Intento de registro de error sin mensaje proporcionado")
            return jsonify({"error": "El mensaje de error es requerido."}), 400

        # Extraer información adicional si está disponible
        error_type = data.get('error_type', 'No especificado')
        user_info = data.get('user_info', 'No proporcionado')
        
        # Registrar el error con toda la información disponible
        logger.error(f"Error del cliente registrado - Tipo: {error_type}, Usuario: {user_info}, Mensaje: {error_message}")
        
        return jsonify({"message": "Error registrado correctamente."}), 200

    except ValueError as e:
        # Error al procesar el JSON
        logger.error(f"Error de formato en la solicitud de registro de error: {str(e)}")
        return jsonify({"error": "Formato de solicitud inválido"}), 400
        
    except SQLAlchemyError as e:
        # Error específico de base de datos si estás guardando en BD
        logger.error(f"Error de base de datos al registrar error del cliente: {str(e)}", exc_info=True)
        return jsonify({"error": "Error al guardar el registro en la base de datos"}), 500
        
    except Exception as e:
        # Capturar cualquier otro error no esperado
        logger.critical(f"Error no manejado al registrar error del cliente: {str(e)}", exc_info=True)
        return jsonify({"error": "Error interno del servidor"}), 500
