from flask import jsonify, request
from flask_login import current_user, login_required
from app.security import bp
from app.logger_config import logger
from app import db
from app.models import BlockedUser, Report, VerificationRequest, User, Notification
from datetime import datetime, timezone


# ==================== Bloqueo de Usuarios ====================

@bp.route('/api/v1/security/block', methods=['POST'])
@login_required
def block_user():
    """Bloquear un usuario"""
    try:
        data = request.get_json()

        if not data or 'blocked_id' not in data:
            return jsonify({'error': 'Campo requerido: blocked_id'}), 400

        blocked_id = data['blocked_id']

        # No puede bloquearse a sí mismo
        if blocked_id == current_user.id:
            return jsonify({'error': 'No puedes bloquearte a ti mismo'}), 400

        # Verificar que el usuario existe
        blocked_user = User.query.filter_by(
            id=blocked_id,
            is_enabled=True,
            deletedAt=None
        ).first()

        if not blocked_user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Verificar si ya está bloqueado
        existing_block = BlockedUser.query.filter_by(
            blocker_id=current_user.id,
            blocked_id=blocked_id,
            deletedAt=None
        ).first()

        if existing_block:
            return jsonify({'error': 'Ya has bloqueado a este usuario'}), 400

        # Crear bloqueo
        block = BlockedUser(
            blocker_id=current_user.id,
            blocked_id=blocked_id,
            reason=data.get('reason')
        )

        db.session.add(block)
        db.session.commit()

        return jsonify({
            'message': 'Usuario bloqueado correctamente',
            'block': {
                'id': block.id,
                'blocked_id': blocked_id
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error bloqueando usuario: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al bloquear usuario'}), 500


@bp.route('/api/v1/security/unblock/<int:user_id>', methods=['DELETE'])
@login_required
def unblock_user(user_id):
    """Desbloquear un usuario"""
    try:
        block = BlockedUser.query.filter_by(
            blocker_id=current_user.id,
            blocked_id=user_id,
            deletedAt=None
        ).first()

        if not block:
            return jsonify({'error': 'No has bloqueado a este usuario'}), 404

        # Soft delete
        block.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Usuario desbloqueado correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error desbloqueando usuario: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al desbloquear usuario'}), 500


@bp.route('/api/v1/security/blocked-users', methods=['GET'])
@login_required
def get_blocked_users():
    """Obtener lista de usuarios bloqueados"""
    try:
        blocks = BlockedUser.query.filter_by(
            blocker_id=current_user.id,
            deletedAt=None
        ).all()

        blocked_users = []
        for block in blocks:
            if block.blocked.deletedAt is None:
                blocked_users.append({
                    'block_id': block.id,
                    'user': {
                        'id': block.blocked.id,
                        'name': f"{block.blocked.first_name} {block.blocked.last_name}",
                        'username': block.blocked.username,
                        'image': block.blocked.profile_image
                    },
                    'reason': block.reason,
                    'blocked_at': block.createdAt.isoformat() if block.createdAt else None
                })

        return jsonify({
            'blocked_users': blocked_users,
            'total': len(blocked_users)
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo usuarios bloqueados: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/security/is-blocked/<int:user_id>', methods=['GET'])
@login_required
def check_if_blocked(user_id):
    """Verificar si un usuario está bloqueado"""
    try:
        # Verificar si el usuario actual bloqueó a este usuario
        blocked_by_me = BlockedUser.query.filter_by(
            blocker_id=current_user.id,
            blocked_id=user_id,
            deletedAt=None
        ).first()

        # Verificar si este usuario bloqueó al usuario actual
        blocked_me = BlockedUser.query.filter_by(
            blocker_id=user_id,
            blocked_id=current_user.id,
            deletedAt=None
        ).first()

        return jsonify({
            'is_blocked_by_me': blocked_by_me is not None,
            'blocked_me': blocked_me is not None,
            'can_interact': blocked_by_me is None and blocked_me is None
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error verificando bloqueo: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ==================== Reportes de Usuarios ====================

@bp.route('/api/v1/security/report', methods=['POST'])
@login_required
def report_user():
    """Reportar un usuario"""
    try:
        data = request.get_json()

        required_fields = ['reported_id', 'reason']
        for field in required_fields:
            if not data or field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        reported_id = data['reported_id']

        # No puede reportarse a sí mismo
        if reported_id == current_user.id:
            return jsonify({'error': 'No puedes reportarte a ti mismo'}), 400

        # Verificar que el usuario existe
        reported_user = User.query.filter_by(
            id=reported_id,
            is_enabled=True,
            deletedAt=None
        ).first()

        if not reported_user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Validar razón
        valid_reasons = ['harassment', 'spam', 'inappropriate', 'fake', 'scam', 'other']
        if data['reason'] not in valid_reasons:
            return jsonify({'error': f'Razón inválida. Opciones válidas: {", ".join(valid_reasons)}'}), 400

        # Crear reporte
        report = Report(
            reporter_id=current_user.id,
            reported_id=reported_id,
            reason=data['reason'],
            description=data.get('description'),
            status='pending'
        )

        db.session.add(report)
        db.session.commit()

        # Notificar a administradores (usuarios con ROLE_SUPERADMIN)
        admins = User.query.filter(
            User.special_roles.contains(['ROLE_SUPERADMIN']),
            User.deletedAt.is_(None)
        ).all()

        for admin in admins:
            notification = Notification(
                user_id=admin.id,
                type='new_report',
                title='Nuevo reporte de usuario',
                message=f"Nuevo reporte de {current_user.first_name} contra {reported_user.first_name} por {data['reason']}",
                link=f'/admin/reports/{report.id}',
                data={'report_id': report.id, 'reason': data['reason']}
            )
            db.session.add(notification)

        db.session.commit()

        return jsonify({
            'message': 'Reporte enviado correctamente',
            'report': {
                'id': report.id,
                'status': report.status
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error reportando usuario: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al enviar el reporte'}), 500


@bp.route('/api/v1/security/reports/my-reports', methods=['GET'])
@login_required
def get_my_reports():
    """Obtener reportes que el usuario ha enviado"""
    try:
        reports = Report.query.filter_by(
            reporter_id=current_user.id,
            deletedAt=None
        ).order_by(Report.createdAt.desc()).all()

        reports_data = []
        for report in reports:
            if report.reported.deletedAt is None:
                reports_data.append({
                    'id': report.id,
                    'reported_user': {
                        'id': report.reported.id,
                        'name': f"{report.reported.first_name} {report.reported.last_name}",
                        'username': report.reported.username
                    },
                    'reason': report.reason,
                    'description': report.description,
                    'status': report.status,
                    'created_at': report.createdAt.isoformat() if report.createdAt else None,
                    'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None
                })

        return jsonify({
            'reports': reports_data,
            'total': len(reports_data)
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo reportes: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ==================== Administración de Reportes (Solo SUPERADMIN) ====================

@bp.route('/api/v1/security/admin/reports', methods=['GET'])
@login_required
def get_all_reports():
    """Obtener todos los reportes (solo SUPERADMIN)"""
    try:
        if 'ROLE_SUPERADMIN' not in current_user.special_roles:
            return jsonify({'error': 'Acceso denegado'}), 403

        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Report.query.filter_by(deletedAt=None)

        if status:
            query = query.filter_by(status=status)

        query = query.order_by(Report.createdAt.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        reports = pagination.items

        reports_data = []
        for report in reports:
            reports_data.append({
                'id': report.id,
                'reporter': {
                    'id': report.reporter.id,
                    'name': f"{report.reporter.first_name} {report.reporter.last_name}",
                    'username': report.reporter.username
                },
                'reported': {
                    'id': report.reported.id,
                    'name': f"{report.reported.first_name} {report.reported.last_name}",
                    'username': report.reported.username
                },
                'reason': report.reason,
                'description': report.description,
                'status': report.status,
                'moderator_notes': report.moderator_notes,
                'created_at': report.createdAt.isoformat() if report.createdAt else None,
                'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None
            })

        return jsonify({
            'reports': reports_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo reportes: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/security/admin/reports/<int:report_id>', methods=['PUT'])
@login_required
def review_report(report_id):
    """Revisar y actualizar un reporte (solo SUPERADMIN)"""
    try:
        if 'ROLE_SUPERADMIN' not in current_user.special_roles:
            return jsonify({'error': 'Acceso denegado'}), 403

        report = Report.query.filter_by(
            id=report_id,
            deletedAt=None
        ).first()

        if not report:
            return jsonify({'error': 'Reporte no encontrado'}), 404

        data = request.get_json()

        if 'status' in data:
            if data['status'] not in ['pending', 'under_review', 'resolved', 'dismissed']:
                return jsonify({'error': 'Estado inválido'}), 400
            report.status = data['status']

        if 'moderator_notes' in data:
            report.moderator_notes = data['moderator_notes']

        report.reviewed_by = current_user.id
        report.reviewed_at = datetime.now(timezone.utc)

        db.session.commit()

        # Notificar al reportante
        notification = Notification(
            user_id=report.reporter_id,
            type='report_reviewed',
            title='Tu reporte ha sido revisado',
            message=f"Tu reporte ha sido {report.status}",
            link=f'/security/my-reports',
            data={'report_id': report_id, 'status': report.status}
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': 'Reporte actualizado correctamente',
            'report': {
                'id': report.id,
                'status': report.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error revisando reporte: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al revisar el reporte'}), 500


# ==================== Verificación de Cuentas ====================

@bp.route('/api/v1/security/verification/request', methods=['POST'])
@login_required
def request_verification():
    """Solicitar verificación de cuenta"""
    try:
        # Verificar si ya está verificado
        if current_user.is_verified:
            return jsonify({'error': 'Tu cuenta ya está verificada'}), 400

        # Verificar si ya tiene una solicitud pendiente
        existing_request = VerificationRequest.query.filter_by(
            user_id=current_user.id,
            status='pending',
            deletedAt=None
        ).first()

        if existing_request:
            return jsonify({'error': 'Ya tienes una solicitud de verificación pendiente'}), 400

        data = request.get_json()

        # Crear solicitud de verificación
        verification_request = VerificationRequest(
            user_id=current_user.id,
            document_url=data.get('document_url'),
            document_type=data.get('document_type'),
            additional_info=data.get('additional_info'),
            status='pending'
        )

        db.session.add(verification_request)
        db.session.commit()

        # Notificar a administradores
        admins = User.query.filter(
            User.special_roles.contains(['ROLE_SUPERADMIN']),
            User.deletedAt.is_(None)
        ).all()

        for admin in admins:
            notification = Notification(
                user_id=admin.id,
                type='verification_request',
                title='Nueva solicitud de verificación',
                message=f"{current_user.first_name} {current_user.last_name} ha solicitado verificar su cuenta",
                link=f'/admin/verifications/{verification_request.id}',
                data={'verification_id': verification_request.id}
            )
            db.session.add(notification)

        db.session.commit()

        return jsonify({
            'message': 'Solicitud de verificación enviada correctamente',
            'verification_request': {
                'id': verification_request.id,
                'status': verification_request.status
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error solicitando verificación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al enviar la solicitud'}), 500


@bp.route('/api/v1/security/verification/my-request', methods=['GET'])
@login_required
def get_my_verification_request():
    """Obtener solicitud de verificación del usuario"""
    try:
        verification_request = VerificationRequest.query.filter_by(
            user_id=current_user.id,
            deletedAt=None
        ).order_by(VerificationRequest.createdAt.desc()).first()

        if not verification_request:
            return jsonify({
                'has_request': False,
                'is_verified': current_user.is_verified
            }), 200

        return jsonify({
            'has_request': True,
            'is_verified': current_user.is_verified,
            'request': {
                'id': verification_request.id,
                'status': verification_request.status,
                'document_type': verification_request.document_type,
                'created_at': verification_request.createdAt.isoformat() if verification_request.createdAt else None,
                'reviewed_at': verification_request.reviewed_at.isoformat() if verification_request.reviewed_at else None,
                'admin_notes': verification_request.admin_notes if verification_request.status != 'pending' else None
            }
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo solicitud: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ==================== Administración de Verificaciones (Solo SUPERADMIN) ====================

@bp.route('/api/v1/security/admin/verifications', methods=['GET'])
@login_required
def get_all_verifications():
    """Obtener todas las solicitudes de verificación (solo SUPERADMIN)"""
    try:
        if 'ROLE_SUPERADMIN' not in current_user.special_roles:
            return jsonify({'error': 'Acceso denegado'}), 403

        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = VerificationRequest.query.filter_by(deletedAt=None)

        if status:
            query = query.filter_by(status=status)

        query = query.order_by(VerificationRequest.createdAt.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        verifications = pagination.items

        verifications_data = []
        for verification in verifications:
            verifications_data.append({
                'id': verification.id,
                'user': {
                    'id': verification.user.id,
                    'name': f"{verification.user.first_name} {verification.user.last_name}",
                    'username': verification.user.username,
                    'email': verification.user.email,
                    'category': verification.user.category
                },
                'status': verification.status,
                'document_url': verification.document_url,
                'document_type': verification.document_type,
                'additional_info': verification.additional_info,
                'admin_notes': verification.admin_notes,
                'created_at': verification.createdAt.isoformat() if verification.createdAt else None,
                'reviewed_at': verification.reviewed_at.isoformat() if verification.reviewed_at else None
            })

        return jsonify({
            'verifications': verifications_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo verificaciones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/security/admin/verifications/<int:verification_id>', methods=['PUT'])
@login_required
def review_verification(verification_id):
    """Revisar solicitud de verificación (solo SUPERADMIN)"""
    try:
        if 'ROLE_SUPERADMIN' not in current_user.special_roles:
            return jsonify({'error': 'Acceso denegado'}), 403

        verification = VerificationRequest.query.filter_by(
            id=verification_id,
            deletedAt=None
        ).first()

        if not verification:
            return jsonify({'error': 'Solicitud no encontrada'}), 404

        data = request.get_json()
        status = data.get('status')

        if status not in ['approved', 'rejected']:
            return jsonify({'error': 'Estado inválido (approved o rejected)'}), 400

        verification.status = status
        verification.admin_notes = data.get('admin_notes')
        verification.reviewed_by = current_user.id
        verification.reviewed_at = datetime.now(timezone.utc)

        # Si se aprueba, actualizar el usuario
        if status == 'approved':
            user = User.query.get(verification.user_id)
            user.is_verified = True
            user.verification_badge_date = datetime.now(timezone.utc)

        db.session.commit()

        # Notificar al usuario
        notification = Notification(
            user_id=verification.user_id,
            type='verification_result',
            title='Resultado de verificación',
            message=f"Tu solicitud de verificación ha sido {status}",
            link='/profile/me',
            data={'verification_id': verification_id, 'status': status}
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': f'Solicitud {status} correctamente',
            'verification': {
                'id': verification.id,
                'status': verification.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error revisando verificación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al revisar la solicitud'}), 500


# ==================== Configuración de Privacidad ====================

@bp.route('/api/v1/security/privacy-settings', methods=['GET'])
@login_required
def get_privacy_settings():
    """Obtener configuración de privacidad del usuario"""
    try:
        return jsonify({
            'is_profile_public': current_user.is_profile_public,
            'show_exact_location': current_user.show_exact_location,
            'email_notifications': current_user.email_notifications,
            'is_verified': current_user.is_verified
        }), 200

    except Exception as e:
        logger.getChild('security').error(f"Error obteniendo configuración: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/security/privacy-settings', methods=['PUT'])
@login_required
def update_privacy_settings():
    """Actualizar configuración de privacidad"""
    try:
        data = request.get_json()

        if 'is_profile_public' in data:
            current_user.is_profile_public = data['is_profile_public']

        if 'show_exact_location' in data:
            current_user.show_exact_location = data['show_exact_location']

        if 'email_notifications' in data:
            current_user.email_notifications = data['email_notifications']

        db.session.commit()

        return jsonify({
            'message': 'Configuración actualizada correctamente',
            'settings': {
                'is_profile_public': current_user.is_profile_public,
                'show_exact_location': current_user.show_exact_location,
                'email_notifications': current_user.email_notifications
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('security').error(f"Error actualizando configuración: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar la configuración'}), 500
