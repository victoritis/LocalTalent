from flask import jsonify, request
from flask_login import current_user, login_required
from app.reviews import bp
from app.logger_config import logger
from app import db
from app.cache import (
    get_user_rating_cached,
    set_user_rating_cached,
    invalidate_user_rating,
)
from app.models import Review, User, Conversation
from app.schemas import ReviewCreateSchema, ReviewUpdateSchema, validate_body
from datetime import datetime, timezone
from sqlalchemy import func


@bp.route('/api/v1/reviews/can-review/<username>', methods=['GET'])
@login_required
def can_review_user(username):
    """Verificar si el usuario actual puede dejar una review a otro usuario"""
    try:
        # Buscar usuario por username
        reviewee = User.query.filter(
            User.username == username,
            User.is_enabled == True,
            User.deletedAt.is_(None)
        ).first()

        if not reviewee:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # No puede hacer review a sí mismo
        if reviewee.id == current_user.id:
            return jsonify({
                'can_review': False,
                'reason': 'No puedes valorarte a ti mismo'
            }), 200

        # Verificar si ya existe una review
        existing_review = Review.query.filter_by(
            reviewer_id=current_user.id,
            reviewee_id=reviewee.id,
            deletedAt=None
        ).first()

        if existing_review:
            return jsonify({
                'can_review': False,
                'reason': 'Ya has valorado a este usuario',
                'existing_review_id': existing_review.id
            }), 200

        # Verificar si han tenido una conversación
        conversation = Conversation.query.filter(
            db.or_(
                db.and_(
                    Conversation.participant1_id == current_user.id,
                    Conversation.participant2_id == reviewee.id
                ),
                db.and_(
                    Conversation.participant1_id == reviewee.id,
                    Conversation.participant2_id == current_user.id
                )
            ),
            Conversation.deletedAt.is_(None)
        ).first()

        if not conversation:
            return jsonify({
                'can_review': False,
                'reason': 'Debes tener una interacción previa con este usuario para poder valorarlo'
            }), 200

        return jsonify({
            'can_review': True,
            'reviewee_id': reviewee.id,
            'reviewee_username': username
        }), 200

    except Exception as e:
        logger.getChild('reviews').error(f"Error verificando si puede hacer review: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/reviews', methods=['POST'])
@login_required
@validate_body(ReviewCreateSchema)
def create_review(payload: ReviewCreateSchema):
    """Crear una nueva review"""
    try:
        reviewee_id = payload.reviewee_id
        rating = payload.rating
        comment = payload.comment or ''

        # Buscar reviewee
        reviewee = User.query.filter_by(
            id=reviewee_id,
            is_enabled=True,
            deletedAt=None
        ).first()

        if not reviewee:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # No puede hacer review a sí mismo
        if reviewee.id == current_user.id:
            return jsonify({'error': 'No puedes valorarte a ti mismo'}), 400

        # Verificar si ya existe una review
        existing_review = Review.query.filter_by(
            reviewer_id=current_user.id,
            reviewee_id=reviewee_id,
            deletedAt=None
        ).first()

        if existing_review:
            return jsonify({'error': 'Ya has valorado a este usuario'}), 400

        # Verificar si han tenido una conversación
        conversation = Conversation.query.filter(
            db.or_(
                db.and_(
                    Conversation.participant1_id == current_user.id,
                    Conversation.participant2_id == reviewee_id
                ),
                db.and_(
                    Conversation.participant1_id == reviewee_id,
                    Conversation.participant2_id == current_user.id
                )
            ),
            Conversation.deletedAt.is_(None)
        ).first()

        if not conversation:
            return jsonify({'error': 'Debes tener una interacción previa con este usuario para poder valorarlo'}), 400

        # Crear review
        review = Review(
            reviewer_id=current_user.id,
            reviewee_id=reviewee_id,
            rating=rating,
            comment=comment
        )

        db.session.add(review)
        db.session.commit()
        invalidate_user_rating(reviewee_id)

        reviewer_username = current_user.display_username

        return jsonify({
            'message': 'Valoración creada correctamente',
            'review': {
                'id': review.id,
                'reviewer_id': review.reviewer_id,
                'reviewer_username': reviewer_username,
                'reviewee_id': review.reviewee_id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.createdAt.isoformat() if review.createdAt else None
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('reviews').error(f"Error creando review: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al crear la valoración'}), 500


@bp.route('/api/v1/reviews/<username>', methods=['GET'])
def get_user_reviews(username):
    """Obtener todas las reviews de un usuario (público)"""
    try:
        # Buscar usuario por username
        user = User.query.filter(
            User.email.like(f"{username}@%"),
            User.is_enabled == True,
            User.deletedAt.is_(None)
        ).first()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Obtener reviews del usuario
        reviews = Review.query.filter_by(
            reviewee_id=user.id,
            deletedAt=None
        ).order_by(Review.createdAt.desc()).all()

        reviews_data = []
        for review in reviews:
            reviewer_username = review.reviewer.display_username
            reviews_data.append({
                'id': review.id,
                'reviewer_id': review.reviewer_id,
                'reviewer_username': reviewer_username,
                'reviewer_name': f"{review.reviewer.first_name} {review.reviewer.last_name}",
                'reviewer_image': review.reviewer.profile_image,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.createdAt.isoformat() if review.createdAt else None
            })

        # Calcular promedio de rating
        avg_rating = db.session.query(func.avg(Review.rating)).filter_by(
            reviewee_id=user.id,
            deletedAt=None
        ).scalar()

        return jsonify({
            'reviews': reviews_data,
            'total': len(reviews_data),
            'average_rating': float(avg_rating) if avg_rating else 0
        }), 200

    except Exception as e:
        logger.getChild('reviews').error(f"Error obteniendo reviews: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/reviews/user/<username>/average', methods=['GET'])
def get_user_average_rating(username):
    """Obtener el promedio de valoraciones de un usuario"""
    try:
        # Buscar usuario por username
        user = User.query.filter(
            User.email.like(f"{username}@%"),
            User.is_enabled == True,
            User.deletedAt.is_(None)
        ).first()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Cache-first: evitar pegarle a la BBDD si ya hay un valor reciente
        cached = get_user_rating_cached(user.id)
        if cached is not None:
            avg_rating, review_count = cached
        else:
            result = db.session.query(
                func.avg(Review.rating).label('average'),
                func.count(Review.id).label('count')
            ).filter_by(
                reviewee_id=user.id,
                deletedAt=None
            ).first()
            avg_rating = float(result.average) if result.average else 0
            review_count = result.count or 0
            set_user_rating_cached(user.id, avg_rating, int(review_count))

        return jsonify({
            'username': username,
            'average_rating': avg_rating,
            'review_count': review_count
        }), 200

    except Exception as e:
        logger.getChild('reviews').error(f"Error obteniendo promedio: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/reviews/<int:review_id>', methods=['PUT'])
@login_required
@validate_body(ReviewUpdateSchema)
def update_review(review_id, payload: ReviewUpdateSchema):
    """Actualizar una review (solo el creador)"""
    try:
        review = Review.query.filter_by(
            id=review_id,
            reviewer_id=current_user.id,
            deletedAt=None
        ).first()

        if not review:
            return jsonify({'error': 'Valoración no encontrada'}), 404

        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(review, field, value)

        db.session.commit()
        invalidate_user_rating(review.reviewee_id)

        reviewer_username = current_user.display_username

        return jsonify({
            'message': 'Valoración actualizada correctamente',
            'review': {
                'id': review.id,
                'reviewer_id': review.reviewer_id,
                'reviewer_username': reviewer_username,
                'reviewee_id': review.reviewee_id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.createdAt.isoformat() if review.createdAt else None,
                'updated_at': review.updatedAt.isoformat() if review.updatedAt else None
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('reviews').error(f"Error actualizando review: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar la valoración'}), 500


@bp.route('/api/v1/reviews/<int:review_id>', methods=['DELETE'])
@login_required
def delete_review(review_id):
    """Eliminar una review (solo el creador) - soft delete"""
    try:
        review = Review.query.filter_by(
            id=review_id,
            reviewer_id=current_user.id,
            deletedAt=None
        ).first()

        if not review:
            return jsonify({'error': 'Valoración no encontrada'}), 404

        # Soft delete
        review.deletedAt = datetime.now(timezone.utc)
        reviewee_id = review.reviewee_id
        db.session.commit()
        invalidate_user_rating(reviewee_id)

        return jsonify({'message': 'Valoración eliminada correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('reviews').error(f"Error eliminando review: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al eliminar la valoración'}), 500


@bp.route('/api/v1/reviews/my-reviews', methods=['GET'])
@login_required
def get_my_reviews():
    """Obtener las reviews que el usuario autenticado ha creado"""
    try:
        reviews = Review.query.filter_by(
            reviewer_id=current_user.id,
            deletedAt=None
        ).order_by(Review.createdAt.desc()).all()

        reviews_data = []
        for review in reviews:
            reviewee_username = review.reviewee.display_username
            reviews_data.append({
                'id': review.id,
                'reviewee_id': review.reviewee_id,
                'reviewee_username': reviewee_username,
                'reviewee_name': f"{review.reviewee.first_name} {review.reviewee.last_name}",
                'reviewee_image': review.reviewee.profile_image,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.createdAt.isoformat() if review.createdAt else None,
                'updated_at': review.updatedAt.isoformat() if review.updatedAt else None
            })

        return jsonify({
            'reviews': reviews_data,
            'total': len(reviews_data)
        }), 200

    except Exception as e:
        logger.getChild('reviews').error(f"Error obteniendo mis reviews: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500
