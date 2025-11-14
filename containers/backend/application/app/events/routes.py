from flask import jsonify, request
from flask_login import current_user, login_required
from app.events import bp
from app.logger_config import logger
from app import db
from app.models import Event, EventRSVP, EventInvitation, EventMessage, User, Notification
from datetime import datetime, timezone
from sqlalchemy import func, and_, or_
import math


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calcular distancia entre dos puntos usando la fórmula de Haversine (en km)"""
    R = 6371  # Radio de la Tierra en km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


# ==================== CRUD de Eventos ====================

@bp.route('/api/v1/events', methods=['GET'])
def get_events():
    """Obtener lista de eventos públicos con filtros opcionales"""
    try:
        # Parámetros de filtro
        category = request.args.get('category')
        event_type = request.args.get('event_type')
        is_online = request.args.get('is_online')
        city = request.args.get('city')
        upcoming_only = request.args.get('upcoming_only', 'true').lower() == 'true'

        # Paginación
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Query base
        query = Event.query.filter_by(
            is_public=True,
            deletedAt=None
        )

        # Aplicar filtros
        if category:
            query = query.filter_by(category=category)

        if event_type:
            query = query.filter_by(event_type=event_type)

        if is_online is not None:
            query = query.filter_by(is_online=is_online.lower() == 'true')

        if city:
            query = query.filter(Event.city.ilike(f'%{city}%'))

        if upcoming_only:
            query = query.filter(Event.start_date >= datetime.now(timezone.utc))

        # Ordenar por fecha de inicio
        query = query.order_by(Event.start_date.asc())

        # Paginación
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        events = pagination.items

        events_data = []
        for event in events:
            # Contar asistentes confirmados
            confirmed_count = EventRSVP.query.filter_by(
                event_id=event.id,
                status='confirmed',
                deletedAt=None
            ).count()

            events_data.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type,
                'creator': {
                    'id': event.creator.id,
                    'name': f"{event.creator.first_name} {event.creator.last_name}",
                    'username': event.creator.email.split('@')[0] if event.creator.email else None,
                    'image': event.creator.profile_image
                },
                'start_date': event.start_date.isoformat() if event.start_date else None,
                'end_date': event.end_date.isoformat() if event.end_date else None,
                'is_online': event.is_online,
                'meeting_url': event.meeting_url if event.is_online else None,
                'location': {
                    'address': event.address,
                    'city': event.city,
                    'country': event.country,
                    'latitude': event.latitude,
                    'longitude': event.longitude
                } if not event.is_online else None,
                'max_attendees': event.max_attendees,
                'confirmed_attendees': confirmed_count,
                'is_full': event.max_attendees and confirmed_count >= event.max_attendees,
                'category': event.category,
                'image_url': event.image_url,
                'created_at': event.createdAt.isoformat() if event.createdAt else None
            })

        return jsonify({
            'events': events_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo eventos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/events/nearby', methods=['GET'])
@login_required
def get_nearby_events():
    """Obtener eventos cercanos basados en la ubicación del usuario"""
    try:
        if not current_user.latitude or not current_user.longitude:
            return jsonify({'error': 'No tienes ubicación configurada'}), 400

        radius = float(request.args.get('radius', 50))  # Radio en km (default 50km)
        upcoming_only = request.args.get('upcoming_only', 'true').lower() == 'true'

        # Obtener todos los eventos públicos
        query = Event.query.filter_by(
            is_public=True,
            is_online=False,
            deletedAt=None
        ).filter(
            Event.latitude.isnot(None),
            Event.longitude.isnot(None)
        )

        if upcoming_only:
            query = query.filter(Event.start_date >= datetime.now(timezone.utc))

        events = query.all()

        # Filtrar por distancia
        nearby_events = []
        for event in events:
            distance = calculate_distance(
                current_user.latitude,
                current_user.longitude,
                event.latitude,
                event.longitude
            )

            if distance <= radius:
                confirmed_count = EventRSVP.query.filter_by(
                    event_id=event.id,
                    status='confirmed',
                    deletedAt=None
                ).count()

                nearby_events.append({
                    'id': event.id,
                    'title': event.title,
                    'description': event.description,
                    'event_type': event.event_type,
                    'creator': {
                        'id': event.creator.id,
                        'name': f"{event.creator.first_name} {event.creator.last_name}",
                        'username': event.creator.email.split('@')[0] if event.creator.email else None,
                        'image': event.creator.profile_image
                    },
                    'start_date': event.start_date.isoformat() if event.start_date else None,
                    'end_date': event.end_date.isoformat() if event.end_date else None,
                    'location': {
                        'address': event.address,
                        'city': event.city,
                        'country': event.country,
                        'latitude': event.latitude,
                        'longitude': event.longitude
                    },
                    'distance': round(distance, 2),
                    'max_attendees': event.max_attendees,
                    'confirmed_attendees': confirmed_count,
                    'is_full': event.max_attendees and confirmed_count >= event.max_attendees,
                    'category': event.category,
                    'image_url': event.image_url
                })

        # Ordenar por distancia
        nearby_events.sort(key=lambda x: x['distance'])

        return jsonify({
            'events': nearby_events,
            'total': len(nearby_events),
            'radius_km': radius
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo eventos cercanos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """Obtener detalles de un evento específico"""
    try:
        event = Event.query.filter_by(
            id=event_id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        # Verificar si es privado y el usuario no es el creador
        if not event.is_public and (not current_user.is_authenticated or current_user.id != event.creator_id):
            return jsonify({'error': 'Acceso denegado'}), 403

        # Contar asistentes por estado
        confirmed_count = EventRSVP.query.filter_by(
            event_id=event_id,
            status='confirmed',
            deletedAt=None
        ).count()

        pending_count = EventRSVP.query.filter_by(
            event_id=event_id,
            status='pending',
            deletedAt=None
        ).count()

        # Obtener asistentes confirmados
        confirmed_rsvps = EventRSVP.query.filter_by(
            event_id=event_id,
            status='confirmed',
            deletedAt=None
        ).all()

        attendees = []
        for rsvp in confirmed_rsvps:
            attendees.append({
                'id': rsvp.user.id,
                'name': f"{rsvp.user.first_name} {rsvp.user.last_name}",
                'username': rsvp.user.email.split('@')[0] if rsvp.user.email else None,
                'image': rsvp.user.profile_image
            })

        # Verificar si el usuario actual tiene RSVP
        user_rsvp = None
        if current_user.is_authenticated:
            rsvp = EventRSVP.query.filter_by(
                event_id=event_id,
                user_id=current_user.id,
                deletedAt=None
            ).first()
            if rsvp:
                user_rsvp = {
                    'id': rsvp.id,
                    'status': rsvp.status,
                    'response_date': rsvp.response_date.isoformat() if rsvp.response_date else None
                }

        event_data = {
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'event_type': event.event_type,
            'creator': {
                'id': event.creator.id,
                'name': f"{event.creator.first_name} {event.creator.last_name}",
                'username': event.creator.email.split('@')[0] if event.creator.email else None,
                'image': event.creator.profile_image
            },
            'start_date': event.start_date.isoformat() if event.start_date else None,
            'end_date': event.end_date.isoformat() if event.end_date else None,
            'is_online': event.is_online,
            'meeting_url': event.meeting_url if event.is_online else None,
            'location': {
                'address': event.address,
                'city': event.city,
                'country': event.country,
                'latitude': event.latitude,
                'longitude': event.longitude
            } if not event.is_online else None,
            'max_attendees': event.max_attendees,
            'is_public': event.is_public,
            'category': event.category,
            'image_url': event.image_url,
            'stats': {
                'confirmed': confirmed_count,
                'pending': pending_count,
                'is_full': event.max_attendees and confirmed_count >= event.max_attendees
            },
            'attendees': attendees,
            'user_rsvp': user_rsvp,
            'created_at': event.createdAt.isoformat() if event.createdAt else None,
            'updated_at': event.updatedAt.isoformat() if event.updatedAt else None
        }

        return jsonify(event_data), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo evento: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/events', methods=['POST'])
@login_required
def create_event():
    """Crear un nuevo evento"""
    try:
        data = request.get_json()

        # Validar campos requeridos
        required_fields = ['title', 'start_date', 'event_type']
        for field in required_fields:
            if not data or field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        # Validar fecha
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        except:
            return jsonify({'error': 'Formato de fecha inválido (usar ISO 8601)'}), 400

        end_date = None
        if 'end_date' in data and data['end_date']:
            try:
                end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'error': 'Formato de fecha de fin inválido'}), 400

        # Crear evento
        event = Event(
            title=data['title'],
            description=data.get('description'),
            event_type=data['event_type'],
            creator_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            is_online=data.get('is_online', False),
            meeting_url=data.get('meeting_url'),
            address=data.get('address'),
            city=data.get('city'),
            country=data.get('country'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            max_attendees=data.get('max_attendees'),
            is_public=data.get('is_public', True),
            category=data.get('category'),
            image_url=data.get('image_url')
        )

        db.session.add(event)
        db.session.commit()

        # Auto-confirmar asistencia del creador
        rsvp = EventRSVP(
            event_id=event.id,
            user_id=current_user.id,
            status='confirmed',
            response_date=datetime.now(timezone.utc)
        )
        db.session.add(rsvp)
        db.session.commit()

        return jsonify({
            'message': 'Evento creado correctamente',
            'event': {
                'id': event.id,
                'title': event.title,
                'start_date': event.start_date.isoformat() if event.start_date else None,
                'event_type': event.event_type
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error creando evento: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al crear el evento'}), 500


@bp.route('/api/v1/events/<int:event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    """Actualizar un evento (solo el creador)"""
    try:
        event = Event.query.filter_by(
            id=event_id,
            creator_id=current_user.id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        data = request.get_json()

        # Actualizar campos
        if 'title' in data:
            event.title = data['title']

        if 'description' in data:
            event.description = data['description']

        if 'event_type' in data:
            event.event_type = data['event_type']

        if 'start_date' in data:
            try:
                event.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'error': 'Formato de fecha inválido'}), 400

        if 'end_date' in data:
            if data['end_date']:
                try:
                    event.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
                except:
                    return jsonify({'error': 'Formato de fecha de fin inválido'}), 400
            else:
                event.end_date = None

        if 'is_online' in data:
            event.is_online = data['is_online']

        if 'meeting_url' in data:
            event.meeting_url = data['meeting_url']

        if 'address' in data:
            event.address = data['address']

        if 'city' in data:
            event.city = data['city']

        if 'country' in data:
            event.country = data['country']

        if 'latitude' in data:
            event.latitude = data['latitude']

        if 'longitude' in data:
            event.longitude = data['longitude']

        if 'max_attendees' in data:
            event.max_attendees = data['max_attendees']

        if 'is_public' in data:
            event.is_public = data['is_public']

        if 'category' in data:
            event.category = data['category']

        if 'image_url' in data:
            event.image_url = data['image_url']

        db.session.commit()

        return jsonify({
            'message': 'Evento actualizado correctamente',
            'event': {
                'id': event.id,
                'title': event.title
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error actualizando evento: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar el evento'}), 500


@bp.route('/api/v1/events/<int:event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    """Eliminar un evento (solo el creador) - soft delete"""
    try:
        event = Event.query.filter_by(
            id=event_id,
            creator_id=current_user.id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        # Soft delete
        event.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Evento eliminado correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error eliminando evento: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al eliminar el evento'}), 500


# ==================== RSVP ====================

@bp.route('/api/v1/events/<int:event_id>/rsvp', methods=['POST'])
@login_required
def create_rsvp(event_id):
    """Confirmar/declinar asistencia a un evento"""
    try:
        event = Event.query.filter_by(
            id=event_id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        # Verificar si el evento es público o el usuario fue invitado
        if not event.is_public:
            invitation = EventInvitation.query.filter_by(
                event_id=event_id,
                invitee_id=current_user.id,
                deletedAt=None
            ).first()

            if not invitation and current_user.id != event.creator_id:
                return jsonify({'error': 'Este es un evento privado'}), 403

        data = request.get_json()
        status = data.get('status', 'confirmed')

        if status not in ['confirmed', 'declined', 'pending']:
            return jsonify({'error': 'Estado inválido'}), 400

        # Verificar si hay cupo disponible
        if status == 'confirmed' and event.max_attendees:
            confirmed_count = EventRSVP.query.filter_by(
                event_id=event_id,
                status='confirmed',
                deletedAt=None
            ).count()

            if confirmed_count >= event.max_attendees:
                return jsonify({'error': 'El evento está lleno'}), 400

        # Verificar si ya existe un RSVP
        existing_rsvp = EventRSVP.query.filter_by(
            event_id=event_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if existing_rsvp:
            # Actualizar RSVP existente
            existing_rsvp.status = status
            existing_rsvp.response_date = datetime.now(timezone.utc)
            existing_rsvp.notes = data.get('notes')
        else:
            # Crear nuevo RSVP
            rsvp = EventRSVP(
                event_id=event_id,
                user_id=current_user.id,
                status=status,
                response_date=datetime.now(timezone.utc),
                notes=data.get('notes')
            )
            db.session.add(rsvp)

        db.session.commit()

        # Crear notificación para el creador del evento
        if current_user.id != event.creator_id:
            notification = Notification(
                user_id=event.creator_id,
                type='event_rsvp',
                title='Nueva respuesta a tu evento',
                message=f"{current_user.first_name} {current_user.last_name} ha {status} asistencia a '{event.title}'",
                link=f'/events/{event_id}',
                data={'event_id': event_id, 'user_id': current_user.id, 'status': status}
            )
            db.session.add(notification)
            db.session.commit()

        return jsonify({
            'message': f'Asistencia {status} correctamente',
            'rsvp': {
                'event_id': event_id,
                'status': status
            }
        }), 200 if existing_rsvp else 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error creando RSVP: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al procesar la respuesta'}), 500


@bp.route('/api/v1/events/<int:event_id>/rsvp', methods=['DELETE'])
@login_required
def cancel_rsvp(event_id):
    """Cancelar asistencia a un evento"""
    try:
        rsvp = EventRSVP.query.filter_by(
            event_id=event_id,
            user_id=current_user.id,
            deletedAt=None
        ).first()

        if not rsvp:
            return jsonify({'error': 'No tienes confirmación para este evento'}), 404

        # Soft delete
        rsvp.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Asistencia cancelada correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error cancelando RSVP: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al cancelar la asistencia'}), 500


# ==================== Invitaciones ====================

@bp.route('/api/v1/events/<int:event_id>/invitations', methods=['POST'])
@login_required
def send_invitation(event_id):
    """Enviar invitación a un evento"""
    try:
        event = Event.query.filter_by(
            id=event_id,
            creator_id=current_user.id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado o no tienes permisos'}), 404

        data = request.get_json()

        if not data or 'invitee_id' not in data:
            return jsonify({'error': 'Campo requerido: invitee_id'}), 400

        invitee_id = data['invitee_id']

        # Verificar que el invitado existe
        invitee = User.query.filter_by(
            id=invitee_id,
            is_enabled=True,
            deletedAt=None
        ).first()

        if not invitee:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # No puede invitarse a sí mismo
        if invitee_id == current_user.id:
            return jsonify({'error': 'No puedes invitarte a ti mismo'}), 400

        # Verificar si ya existe una invitación
        existing_invitation = EventInvitation.query.filter_by(
            event_id=event_id,
            invitee_id=invitee_id,
            deletedAt=None
        ).first()

        if existing_invitation:
            return jsonify({'error': 'Ya has enviado una invitación a este usuario'}), 400

        # Crear invitación
        invitation = EventInvitation(
            event_id=event_id,
            inviter_id=current_user.id,
            invitee_id=invitee_id,
            message=data.get('message'),
            status='pending'
        )

        db.session.add(invitation)
        db.session.commit()

        # Crear notificación para el invitado
        notification = Notification(
            user_id=invitee_id,
            type='event_invitation',
            title='Invitación a evento',
            message=f"{current_user.first_name} {current_user.last_name} te ha invitado a '{event.title}'",
            link=f'/events/{event_id}',
            data={'event_id': event_id, 'invitation_id': invitation.id}
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': 'Invitación enviada correctamente',
            'invitation': {
                'id': invitation.id,
                'event_id': event_id,
                'invitee_id': invitee_id
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error enviando invitación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al enviar la invitación'}), 500


@bp.route('/api/v1/events/invitations/<int:invitation_id>/respond', methods=['PUT'])
@login_required
def respond_invitation(invitation_id):
    """Responder a una invitación de evento"""
    try:
        invitation = EventInvitation.query.filter_by(
            id=invitation_id,
            invitee_id=current_user.id,
            deletedAt=None
        ).first()

        if not invitation:
            return jsonify({'error': 'Invitación no encontrada'}), 404

        data = request.get_json()
        status = data.get('status')

        if status not in ['accepted', 'declined']:
            return jsonify({'error': 'Estado inválido (accepted o declined)'}), 400

        invitation.status = status
        db.session.commit()

        # Si acepta, crear RSVP automáticamente
        if status == 'accepted':
            existing_rsvp = EventRSVP.query.filter_by(
                event_id=invitation.event_id,
                user_id=current_user.id,
                deletedAt=None
            ).first()

            if not existing_rsvp:
                rsvp = EventRSVP(
                    event_id=invitation.event_id,
                    user_id=current_user.id,
                    status='confirmed',
                    response_date=datetime.now(timezone.utc)
                )
                db.session.add(rsvp)
                db.session.commit()

        # Notificar al creador del evento
        notification = Notification(
            user_id=invitation.inviter_id,
            type='invitation_response',
            title='Respuesta a invitación',
            message=f"{current_user.first_name} {current_user.last_name} ha {status} tu invitación",
            link=f'/events/{invitation.event_id}',
            data={'event_id': invitation.event_id, 'status': status}
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'message': f'Invitación {status} correctamente'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error respondiendo invitación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al responder la invitación'}), 500


@bp.route('/api/v1/events/invitations/my-invitations', methods=['GET'])
@login_required
def get_my_invitations():
    """Obtener invitaciones pendientes del usuario"""
    try:
        invitations = EventInvitation.query.filter_by(
            invitee_id=current_user.id,
            status='pending',
            deletedAt=None
        ).all()

        invitations_data = []
        for invitation in invitations:
            if invitation.event.deletedAt is None:
                invitations_data.append({
                    'id': invitation.id,
                    'event': {
                        'id': invitation.event.id,
                        'title': invitation.event.title,
                        'description': invitation.event.description,
                        'start_date': invitation.event.start_date.isoformat() if invitation.event.start_date else None,
                        'event_type': invitation.event.event_type
                    },
                    'inviter': {
                        'id': invitation.inviter.id,
                        'name': f"{invitation.inviter.first_name} {invitation.inviter.last_name}",
                        'username': invitation.inviter.email.split('@')[0] if invitation.inviter.email else None,
                        'image': invitation.inviter.profile_image
                    },
                    'message': invitation.message,
                    'created_at': invitation.createdAt.isoformat() if invitation.createdAt else None
                })

        return jsonify({
            'invitations': invitations_data,
            'total': len(invitations_data)
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo invitaciones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


# ==================== Mensajes del Evento ====================

@bp.route('/api/v1/events/<int:event_id>/messages', methods=['GET'])
@login_required
def get_event_messages(event_id):
    """Obtener mensajes del chat grupal del evento"""
    try:
        # Verificar que el usuario tiene acceso al evento
        event = Event.query.filter_by(
            id=event_id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        # Verificar que el usuario es asistente confirmado o creador
        rsvp = EventRSVP.query.filter_by(
            event_id=event_id,
            user_id=current_user.id,
            status='confirmed',
            deletedAt=None
        ).first()

        if not rsvp and current_user.id != event.creator_id:
            return jsonify({'error': 'Debes confirmar asistencia para ver los mensajes'}), 403

        # Obtener mensajes
        messages = EventMessage.query.filter_by(
            event_id=event_id,
            deletedAt=None
        ).order_by(EventMessage.createdAt.asc()).all()

        messages_data = []
        for message in messages:
            messages_data.append({
                'id': message.id,
                'sender': {
                    'id': message.sender.id,
                    'name': f"{message.sender.first_name} {message.sender.last_name}",
                    'username': message.sender.email.split('@')[0] if message.sender.email else None,
                    'image': message.sender.profile_image
                },
                'content': message.content,
                'created_at': message.createdAt.isoformat() if message.createdAt else None
            })

        return jsonify({
            'messages': messages_data,
            'total': len(messages_data)
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo mensajes: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/events/<int:event_id>/messages', methods=['POST'])
@login_required
def send_event_message(event_id):
    """Enviar mensaje al chat grupal del evento"""
    try:
        # Verificar que el usuario es asistente confirmado o creador
        event = Event.query.filter_by(
            id=event_id,
            deletedAt=None
        ).first()

        if not event:
            return jsonify({'error': 'Evento no encontrado'}), 404

        rsvp = EventRSVP.query.filter_by(
            event_id=event_id,
            user_id=current_user.id,
            status='confirmed',
            deletedAt=None
        ).first()

        if not rsvp and current_user.id != event.creator_id:
            return jsonify({'error': 'Debes confirmar asistencia para enviar mensajes'}), 403

        data = request.get_json()

        if not data or 'content' not in data:
            return jsonify({'error': 'Campo requerido: content'}), 400

        # Crear mensaje
        message = EventMessage(
            event_id=event_id,
            sender_id=current_user.id,
            content=data['content']
        )

        db.session.add(message)
        db.session.commit()

        return jsonify({
            'message': 'Mensaje enviado correctamente',
            'event_message': {
                'id': message.id,
                'content': message.content,
                'created_at': message.createdAt.isoformat() if message.createdAt else None
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('events').error(f"Error enviando mensaje: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al enviar el mensaje'}), 500


# ==================== Mis Eventos ====================

@bp.route('/api/v1/events/my-events', methods=['GET'])
@login_required
def get_my_events():
    """Obtener eventos creados por el usuario"""
    try:
        events = Event.query.filter_by(
            creator_id=current_user.id,
            deletedAt=None
        ).order_by(Event.start_date.desc()).all()

        events_data = []
        for event in events:
            confirmed_count = EventRSVP.query.filter_by(
                event_id=event.id,
                status='confirmed',
                deletedAt=None
            ).count()

            events_data.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'event_type': event.event_type,
                'start_date': event.start_date.isoformat() if event.start_date else None,
                'end_date': event.end_date.isoformat() if event.end_date else None,
                'is_online': event.is_online,
                'is_public': event.is_public,
                'confirmed_attendees': confirmed_count,
                'max_attendees': event.max_attendees,
                'image_url': event.image_url,
                'created_at': event.createdAt.isoformat() if event.createdAt else None
            })

        return jsonify({
            'events': events_data,
            'total': len(events_data)
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo mis eventos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/events/my-rsvps', methods=['GET'])
@login_required
def get_my_rsvps():
    """Obtener eventos a los que el usuario ha confirmado asistencia"""
    try:
        rsvps = EventRSVP.query.filter_by(
            user_id=current_user.id,
            deletedAt=None
        ).all()

        events_data = []
        for rsvp in rsvps:
            if rsvp.event.deletedAt is None:
                events_data.append({
                    'rsvp_id': rsvp.id,
                    'status': rsvp.status,
                    'response_date': rsvp.response_date.isoformat() if rsvp.response_date else None,
                    'event': {
                        'id': rsvp.event.id,
                        'title': rsvp.event.title,
                        'description': rsvp.event.description,
                        'event_type': rsvp.event.event_type,
                        'creator': {
                            'id': rsvp.event.creator.id,
                            'name': f"{rsvp.event.creator.first_name} {rsvp.event.creator.last_name}",
                            'username': rsvp.event.creator.email.split('@')[0] if rsvp.event.creator.email else None
                        },
                        'start_date': rsvp.event.start_date.isoformat() if rsvp.event.start_date else None,
                        'end_date': rsvp.event.end_date.isoformat() if rsvp.event.end_date else None,
                        'is_online': rsvp.event.is_online,
                        'location': {
                            'city': rsvp.event.city,
                            'address': rsvp.event.address
                        } if not rsvp.event.is_online else None,
                        'image_url': rsvp.event.image_url
                    }
                })

        return jsonify({
            'rsvps': events_data,
            'total': len(events_data)
        }), 200

    except Exception as e:
        logger.getChild('events').error(f"Error obteniendo mis RSVPs: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500
