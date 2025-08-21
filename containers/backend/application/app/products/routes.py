from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, desc
from sqlalchemy.exc import SQLAlchemyError
from urllib.parse import unquote
from flask_cors import cross_origin
from app import db
from app.models import Organization, OrgUser, Alert, Product, CPE
from app.logger_config import logger
from app.organization.services import get_organization_by_name_and_verify_access  # se sigue usando para validar acceso
from app.products.services import add_product_service, get_products_service, search_cpes_service, delete_product_and_deactivate_alerts, update_product_settings_service
from app.products import bp

@bp.route('/api/v1/organizations/<string:name>/add-products', methods=['POST'])
@login_required
def add_product(name):
    """
    Se agrega un producto (CPE) a la organización indicada.
    Llama a la función de servicio que ejecuta la lógica.
    """
    # Verificar acceso a la organización
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        return error_response
    return add_product_service(org, current_user, request.get_json(), current_app)

@bp.route('/api/v1/organizations/<string:name>/products', methods=['GET'])
@login_required
def get_products(name):
    """
    Devuelve los productos (CPEs) registrados para la organización.
    Llama a la función de servicio que ejecuta la lógica.
    Admite paginación, filtro 'recent' y búsqueda 'search'.
    """
    logger.getChild('products').debug(f"Inicio de solicitud GET /organizations/{name}/products")
    org, error_response = get_organization_by_name_and_verify_access(name)
    if error_response:
        logger.getChild('products').warning(f"Acceso denegado o error al obtener Org '{name}' en get_products")
        return error_response

    # Obtener parámetros de la query string
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 10, type=int)
    recent_filter = request.args.get('recent', 'false').lower() == 'true'
    search_term = request.args.get('search', None, type=str) # Obtener término de búsqueda

    logger.getChild('products').debug(f"Llamando a get_products_service para Org {org.id} ('{name}') con page={page}, limit={per_page}, recent={recent_filter}, search='{search_term or 'N/A'}'")
    result = get_products_service(org, page, per_page, recent_filter, search_term) # Pasar search_term

    # Log ANTES de jsonify
    logger.getChild('products').debug(f"Datos recibidos del servicio para Org {org.id} antes de jsonify: {result}")

    # Si hay error en el servicio, devolver 500
    if "error" in result and result.get("code") == "internal_server_error":
        logger.getChild('products').error(f"Error interno detectado en el resultado del servicio para Org {org.id}: {result.get('error')}")
        return jsonify(result), 500
    # Si no hay error interno, devolver 200 (incluso si no hay resultados de búsqueda)
    else:
        logger.getChild('products').debug(f"Devolviendo respuesta JSON (puede ser vacía si no hay resultados) para Org {org.id}")
        return jsonify(result), 200

@bp.route('/api/v1/cpes/search', methods=['GET'])
@login_required
def search_cpes():
    """
    Busca CPEs en la BD que coincidan con el criterio de búsqueda.
    Llama a la función de servicio que ejecuta la lógica.
    """
    search_term = request.args.get('q', '').strip()
    offset = request.args.get('offset', 0, type=int)
    limit = request.args.get('limit', 10, type=int)
    return search_cpes_service(search_term, offset, limit)


@bp.route('/api/v1/organizations/<string:name>/products/<path:cpe_name_encoded>', methods=['DELETE'])
@login_required
def delete_organization_product(name, cpe_name_encoded):
    """
    Elimina un producto (CPE) de una organización específica.
    Requiere permisos de administrador de la organización o superadministrador.
    Desactiva las alertas asociadas a ese producto en esa organización.
    """
    try:
        # Decodificar el nombre del CPE desde la URL
        cpe_name = unquote(cpe_name_encoded)
        logger.getChild('products').info(f"Solicitud DELETE para producto '{cpe_name}' en Org '{name}' por Usuario {current_user.id}")

        # 1. Obtener organización y verificar acceso general del usuario
        org, error_response = get_organization_by_name_and_verify_access(name)
        if error_response:
            return error_response

        # 2. Verificar permisos específicos para eliminar (Admin o Superadmin)
        is_superadmin = "ROLE_SUPERADMIN" in current_user.special_roles
        is_org_admin = any(role == "ROLE_ORG_ADMIN" for role in current_user.get_roles_for_organization(org.id))

        if not (is_superadmin or is_org_admin):
            resp = jsonify({"error": "No tienes permisos para eliminar productos en esta organización", "code": "permission_denied"})
            logger.getChild('products').warning(f"Usuario {current_user.id} sin permisos de admin intentó eliminar producto '{cpe_name}' de Org {org.id}")
            return resp, 403

        # 3. Llamar al servicio para eliminar el producto y desactivar alertas
        success, message = delete_product_and_deactivate_alerts(org.id, cpe_name)

        if success:
            resp = jsonify({"message": message})
            logger.getChild('products').info(f"Producto '{cpe_name}' eliminado exitosamente de Org {org.id} por Usuario {current_user.id}")
            return resp, 200
        else:
            status_code = 404 if "no encontrado" in message else 500
            resp = jsonify({"error": message})
            return resp, status_code

    except Exception as e:
        resp = jsonify({"error": "Error interno del servidor"})
        logger.getChild('products').error(f"Error inesperado en DELETE /products: Org='{name}', CPE='{cpe_name}', Error: {str(e)}", exc_info=True)
        return resp, 500

@bp.route('/api/v1/organizations/<string:name>/products/<path:cpe_name_encoded>/settings', methods=['PATCH'])
@login_required
def update_product_settings(name, cpe_name_encoded):
    """
    Actualiza la configuración de un producto específico (ej. send_email).
    Requiere permisos de administrador de la organización o superadministrador.
    """
    try:
        # Decodificar el nombre del CPE desde la URL
        cpe_name = unquote(cpe_name_encoded)
        logger.getChild('products').info(f"Solicitud PATCH para settings de producto '{cpe_name}' en Org '{name}' por Usuario {current_user.id}")

        # 1. Obtener organización y verificar acceso general del usuario
        org, error_response = get_organization_by_name_and_verify_access(name)
        if error_response:
            return error_response # Devuelve la respuesta de error directamente

        # 2. Obtener datos de la solicitud
        data = request.get_json()
        if not data:
            return jsonify({"error": "Falta el cuerpo de la solicitud JSON", "code": "bad_request"}), 400

        # 3. Llamar al servicio para actualizar la configuración
        result, status_code = update_product_settings_service(org, current_user, cpe_name, data)

        return jsonify(result), status_code

    except Exception as e:
        # Loguear el error inesperado
        cpe_name_log = unquote(cpe_name_encoded) if 'cpe_name_encoded' in locals() else 'desconocido'
        logger.getChild('products').error(f"Error inesperado en PATCH /settings: Org='{name}', CPE='{cpe_name_log}', Error: {str(e)}", exc_info=True)
        # Devolver una respuesta genérica de error 500
        return jsonify({"error": "Error interno del servidor", "code": "internal_server_error"}), 500


@bp.route('/api/v1/organizations/<string:name>/products/<path:cpe_name_encoded>', methods=['OPTIONS'])
def options_organization_product(name, cpe_name_encoded):
    """
    Maneja la solicitud preflight OPTIONS para la operación DELETE.
    Devuelve los encabezados CORS necesarios.
    """
    logger.getChild('products').debug(f"Solicitud OPTIONS recibida para ruta de productos: {name}/{cpe_name_encoded}")
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '3600')
    return response, 200

# Añadir ruta OPTIONS para el nuevo endpoint de settings
@bp.route('/api/v1/organizations/<string:name>/products/<path:cpe_name_encoded>/settings', methods=['OPTIONS'])
def options_product_settings(name, cpe_name_encoded):
    """
    Maneja la solicitud preflight OPTIONS para la operación PATCH de settings.
    """
    logger.getChild('products').debug(f"Solicitud OPTIONS recibida para ruta de settings de producto: {name}/{cpe_name_encoded}")
    response = jsonify({})
    # Ajusta los orígenes permitidos según tu configuración
    response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
    # Asegúrate de incluir PATCH en los métodos permitidos
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '3600') # Cache preflight por 1 hora
    return response, 200
