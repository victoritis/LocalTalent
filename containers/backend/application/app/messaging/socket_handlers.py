from flask import request
from flask_login import current_user
from flask_socketio import emit, join_room, leave_room, disconnect
from app import socketio, db
from app.models import User, Conversation, Message
from app.logger_config import logger
from app.notifications.routes import create_notification
from datetime import datetime, timezone
from sqlalchemy import or_


@socketio.on('connect')
def handle_connect():
    """Maneja la conexión de un cliente"""
    if not current_user.is_authenticated:
        logger.getChild('socketio').warning('Intento de conexión no autenticado')
        return False  # Rechazar conexión

    logger.getChild('socketio').info(f'Usuario {current_user.id} conectado via WebSocket')
    # Unirse a una sala personal para notificaciones
    join_room(f'user_{current_user.id}')
    emit('connected', {'user_id': current_user.id})


@socketio.on('disconnect')
def handle_disconnect():
    """Maneja la desconexión de un cliente"""
    if current_user.is_authenticated:
        logger.getChild('socketio').info(f'Usuario {current_user.id} desconectado')
        leave_room(f'user_{current_user.id}')


@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Unirse a una sala de conversación específica"""
    if not current_user.is_authenticated:
        return

    conversation_id = data.get('conversation_id')

    if not conversation_id:
        emit('error', {'message': 'conversation_id requerido'})
        return

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
        emit('error', {'message': 'Conversación no encontrada o no autorizada'})
        return

    room_name = f'conversation_{conversation_id}'
    join_room(room_name)
    logger.getChild('socketio').info(f'Usuario {current_user.id} se unió a {room_name}')
    emit('joined_conversation', {'conversation_id': conversation_id})


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """Salir de una sala de conversación"""
    if not current_user.is_authenticated:
        return

    conversation_id = data.get('conversation_id')

    if not conversation_id:
        return

    room_name = f'conversation_{conversation_id}'
    leave_room(room_name)
    logger.getChild('socketio').info(f'Usuario {current_user.id} salió de {room_name}')
    emit('left_conversation', {'conversation_id': conversation_id})


@socketio.on('send_message')
def handle_send_message(data):
    """Enviar un mensaje en tiempo real"""
    if not current_user.is_authenticated:
        emit('error', {'message': 'No autenticado'})
        return

    conversation_id = data.get('conversation_id')
    content = data.get('content', '').strip()

    if not conversation_id or not content:
        emit('error', {'message': 'conversation_id y content son requeridos'})
        return

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
            emit('error', {'message': 'Conversación no encontrada o no autorizada'})
            return

        # Crear mensaje
        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=content,
            is_read=False
        )

        db.session.add(message)

        # Actualizar timestamp de última actividad
        conversation.last_message_at = datetime.now(timezone.utc)
        db.session.commit()

        # Obtener datos del sender
        sender_username = current_user.email.split('@')[0] if current_user.email else None

        # Preparar datos del mensaje
        message_data = {
            'id': message.id,
            'conversation_id': conversation_id,
            'content': message.content,
            'sender_id': message.sender_id,
            'sender_username': sender_username,
            'is_read': message.is_read,
            'created_at': message.createdAt.isoformat() if message.createdAt else None
        }

        # Enviar mensaje a la sala de la conversación
        room_name = f'conversation_{conversation_id}'
        emit('new_message', message_data, room=room_name)

        # Determinar el otro participante para enviar notificación
        other_user_id = conversation.participant2_id if conversation.participant1_id == current_user.id else conversation.participant1_id

        # Crear notificación en BD
        create_notification(
            user_id=other_user_id,
            notification_type='message',
            title=f'Nuevo mensaje de {current_user.first_name} {current_user.last_name}',
            message=content[:100] + ('...' if len(content) > 100 else ''),
            link=f'/messages?conversation={conversation_id}',
            data={'conversation_id': conversation_id, 'sender_id': current_user.id}
        )

        # Enviar notificación WebSocket al otro usuario
        notification_data = {
            'conversation_id': conversation_id,
            'message': message_data,
            'sender': {
                'id': current_user.id,
                'username': sender_username,
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'profile_image': current_user.profile_image
            }
        }
        emit('message_notification', notification_data, room=f'user_{other_user_id}')

        logger.getChild('socketio').info(f'Mensaje enviado: user {current_user.id} -> conversation {conversation_id}')

    except Exception as e:
        db.session.rollback()
        logger.getChild('socketio').error(f'Error enviando mensaje: {str(e)}', exc_info=True)
        emit('error', {'message': 'Error al enviar mensaje'})


@socketio.on('mark_as_read')
def handle_mark_as_read(data):
    """Marcar mensaje como leído"""
    if not current_user.is_authenticated:
        return

    message_id = data.get('message_id')

    if not message_id:
        emit('error', {'message': 'message_id requerido'})
        return

    try:
        message = Message.query.get(message_id)

        if not message or message.sender_id == current_user.id:
            return

        # Verificar que el usuario es participante de la conversación
        conversation = Conversation.query.filter_by(
            id=message.conversation_id,
            deletedAt=None
        ).filter(
            or_(
                Conversation.participant1_id == current_user.id,
                Conversation.participant2_id == current_user.id
            )
        ).first()

        if not conversation:
            return

        # Marcar como leído
        message.is_read = True
        message.read_at = datetime.now(timezone.utc)
        db.session.commit()

        # Notificar al remitente que el mensaje fue leído
        emit('message_read', {
            'message_id': message_id,
            'conversation_id': message.conversation_id,
            'read_at': message.read_at.isoformat()
        }, room=f'user_{message.sender_id}')

    except Exception as e:
        db.session.rollback()
        logger.getChild('socketio').error(f'Error marcando mensaje como leído: {str(e)}', exc_info=True)


@socketio.on('typing')
def handle_typing(data):
    """Notificar que el usuario está escribiendo"""
    if not current_user.is_authenticated:
        return

    conversation_id = data.get('conversation_id')
    is_typing = data.get('is_typing', False)

    if not conversation_id:
        return

    try:
        # Verificar que el usuario es participante
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
            return

        # Determinar el otro participante
        other_user_id = conversation.participant2_id if conversation.participant1_id == current_user.id else conversation.participant1_id

        sender_username = current_user.email.split('@')[0] if current_user.email else None

        # Notificar al otro usuario
        emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': current_user.id,
            'username': sender_username,
            'is_typing': is_typing
        }, room=f'user_{other_user_id}')

    except Exception as e:
        logger.getChild('socketio').error(f'Error en evento typing: {str(e)}', exc_info=True)
