from flask import jsonify, request
from flask_login import current_user, login_required
from app.messaging import bp
from app.logger_config import logger
from app import db
from app.models import User, Conversation, Message
from datetime import datetime, timezone
from sqlalchemy import or_, and_


@bp.route('/api/v1/conversations', methods=['GET'])
@login_required
def get_conversations():
    """Obtener lista de conversaciones del usuario autenticado"""
    try:
        # Obtener conversaciones donde el usuario es participante
        conversations = Conversation.query.filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            ),
            Conversation.deletedAt.is_(None)
        ).order_by(Conversation.last_message_at.desc().nullslast(), Conversation.createdAt.desc()).all()

        conversations_data = []
        for conv in conversations:
            # Determinar quién es el otro participante
            other_user_id = conv.participant2_id if conv.participant1_id == current_user.id else conv.participant1_id
            other_user = User.query.get(other_user_id)

            if not other_user:
                continue

            # Obtener último mensaje
            last_message = Message.query.filter_by(
                conversation_id=conv.id,
                deletedAt=None
            ).order_by(Message.createdAt.desc()).first()

            # Contar mensajes no leídos
            unread_count = Message.query.filter_by(
                conversation_id=conv.id,
                is_read=False,
                deletedAt=None
            ).filter(Message.sender_id != current_user.id).count()

            other_username = other_user.email.split('@')[0] if other_user.email else None

            conversations_data.append({
                'id': conv.id,
                'other_user': {
                    'id': other_user.id,
                    'username': other_username,
                    'first_name': other_user.first_name,
                    'last_name': other_user.last_name,
                    'profile_image': other_user.profile_image
                },
                'last_message': {
                    'content': last_message.content,
                    'created_at': last_message.createdAt.isoformat() if last_message.createdAt else None,
                    'is_mine': last_message.sender_id == current_user.id
                } if last_message else None,
                'unread_count': unread_count,
                'last_message_at': conv.last_message_at.isoformat() if conv.last_message_at else None
            })

        return jsonify({'conversations': conversations_data}), 200
    except Exception as e:
        logger.getChild('messaging').error(f"Error obteniendo conversaciones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/conversations/<int:user_id>', methods=['GET'])
@login_required
def get_or_create_conversation(user_id):
    """Obtener o crear conversación con un usuario específico"""
    try:
        if user_id == current_user.id:
            return jsonify({'error': 'No puedes crear una conversación contigo mismo'}), 400

        # Verificar que el otro usuario existe
        other_user = User.query.get(user_id)
        if not other_user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Buscar conversación existente (en ambas direcciones)
        conversation = Conversation.query.filter(
            or_(
                and_(Conversation.participant1_id == current_user.id, Conversation.participant2_id == user_id),
                and_(Conversation.participant1_id == user_id, Conversation.participant2_id == current_user.id)
            ),
            Conversation.deletedAt.is_(None)
        ).first()

        # Si no existe, crear nueva conversación
        if not conversation:
            conversation = Conversation(
                participant1_id=current_user.id,
                participant2_id=user_id
            )
            db.session.add(conversation)
            db.session.commit()

        # Incluir información del otro usuario en la respuesta
        other_username = other_user.email.split('@')[0] if other_user.email else None

        return jsonify({
            'conversation_id': conversation.id,
            'created': conversation.createdAt.isoformat() if conversation.createdAt else None,
            'other_user': {
                'id': other_user.id,
                'username': other_username,
                'first_name': other_user.first_name,
                'last_name': other_user.last_name,
                'profile_image': other_user.profile_image
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('messaging').error(f"Error obteniendo/creando conversación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/conversations/<int:conversation_id>/messages', methods=['GET'])
@login_required
def get_messages(conversation_id):
    """Obtener mensajes de una conversación"""
    try:
        # Verificar que el usuario es participante de la conversación
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            deletedAt=None
        ).filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            )
        ).first()

        if not conversation:
            return jsonify({'error': 'Conversación no encontrada'}), 404

        # Parámetros de paginación
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Obtener mensajes
        messages = Message.query.filter_by(
            conversation_id=conversation_id,
            deletedAt=None
        ).order_by(Message.createdAt.desc()).limit(limit).offset(offset).all()

        messages_data = []
        for msg in reversed(messages):  # Invertir para orden cronológico
            sender = User.query.get(msg.sender_id)
            sender_username = sender.email.split('@')[0] if sender and sender.email else None

            messages_data.append({
                'id': msg.id,
                'content': msg.content,
                'sender_id': msg.sender_id,
                'sender_username': sender_username,
                'is_mine': msg.sender_id == current_user.id,
                'is_read': msg.is_read,
                'created_at': msg.createdAt.isoformat() if msg.createdAt else None
            })

        return jsonify({
            'messages': messages_data,
            'total': Message.query.filter_by(conversation_id=conversation_id, deletedAt=None).count()
        }), 200
    except Exception as e:
        logger.getChild('messaging').error(f"Error obteniendo mensajes: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/conversations/<int:conversation_id>/messages', methods=['POST'])
@login_required
def send_message(conversation_id):
    """Enviar mensaje a una conversación (REST endpoint)"""
    try:
        # Verificar que el usuario es participante de la conversación
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            deletedAt=None
        ).filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            )
        ).first()

        if not conversation:
            return jsonify({'error': 'Conversación no encontrada'}), 404

        data = request.get_json()
        content = data.get('content', '').strip()

        if not content:
            return jsonify({'error': 'El mensaje no puede estar vacío'}), 400

        # Crear mensaje
        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=content,
            is_read=False
        )

        db.session.add(message)

        # Actualizar timestamp de última actividad en conversación
        conversation.last_message_at = datetime.now(timezone.utc)
        db.session.commit()

        # Obtener datos del sender para la respuesta
        sender_username = current_user.email.split('@')[0] if current_user.email else None

        return jsonify({
            'message': 'Mensaje enviado correctamente',
            'data': {
                'id': message.id,
                'content': message.content,
                'sender_id': message.sender_id,
                'sender_username': sender_username,
                'is_mine': True,
                'is_read': message.is_read,
                'created_at': message.createdAt.isoformat() if message.createdAt else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.getChild('messaging').error(f"Error enviando mensaje: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al enviar mensaje'}), 500


@bp.route('/api/v1/conversations/<int:conversation_id>/mark-read', methods=['POST'])
@login_required
def mark_messages_as_read(conversation_id):
    """Marcar todos los mensajes de una conversación como leídos"""
    try:
        # Verificar que el usuario es participante de la conversación
        conversation = Conversation.query.filter_by(
            id=conversation_id,
            deletedAt=None
        ).filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            )
        ).first()

        if not conversation:
            return jsonify({'error': 'Conversación no encontrada'}), 404

        # Marcar como leídos todos los mensajes que no son del usuario actual
        Message.query.filter_by(
            conversation_id=conversation_id,
            is_read=False
        ).filter(
            Message.sender_id != current_user.id,
            Message.deletedAt.is_(None)
        ).update({
            'is_read': True,
            'read_at': datetime.now(timezone.utc)
        })

        db.session.commit()

        return jsonify({'message': 'Mensajes marcados como leídos'}), 200
    except Exception as e:
        db.session.rollback()
        logger.getChild('messaging').error(f"Error marcando mensajes como leídos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/unread-count', methods=['GET'])
@login_required
def get_unread_count():
    """Obtener conteo total de mensajes no leídos"""
    try:
        # Obtener IDs de conversaciones donde el usuario participa
        conversation_ids = db.session.query(Conversation.id).filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            ),
            Conversation.deletedAt.is_(None)
        ).all()

        conversation_ids = [conv_id[0] for conv_id in conversation_ids]

        # Contar mensajes no leídos
        unread_count = Message.query.filter(
            Message.conversation_id.in_(conversation_ids),
            Message.sender_id != current_user.id,
            Message.is_read == False,
            Message.deletedAt.is_(None)
        ).count()

        return jsonify({'unread_count': unread_count}), 200
    except Exception as e:
        logger.getChild('messaging').error(f"Error obteniendo conteo de no leídos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500
