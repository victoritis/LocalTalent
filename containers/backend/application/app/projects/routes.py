from flask import jsonify, request
from flask_login import current_user, login_required
from app.projects import bp
from app.logger_config import logger
from app import db
from app.models import Project, ProjectMember, User, Notification
from datetime import datetime, timezone


# ==================== CRUD de Proyectos ====================

@bp.route('/api/v1/projects', methods=['GET'])
def get_projects():
    """Obtener lista de proyectos públicos con filtros opcionales"""
    try:
        # Parámetros de filtro
        category = request.args.get('category')
        status = request.args.get('status')
        required_skill = request.args.get('required_skill')

        # Paginación
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Query base
        query = Project.query.filter_by(
            is_public=True,
            deletedAt=None
        )

        # Aplicar filtros
        if category:
            query = query.filter_by(category=category)

        if status:
            query = query.filter_by(status=status)

        if required_skill:
            query = query.filter(Project.required_skills.any(required_skill))

        # Ordenar por fecha de creación
        query = query.order_by(Project.createdAt.desc())

        # Paginación
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        projects = pagination.items

        projects_data = []
        for project in projects:
            # Contar miembros activos
            active_members = ProjectMember.query.filter_by(
                project_id=project.id,
                status='active',
                deletedAt=None
            ).count()

            projects_data.append({
                'id': project.id,
                'title': project.title,
                'description': project.description,
                'creator': {
                    'id': project.creator.id,
                    'name': f"{project.creator.first_name} {project.creator.last_name}",
                    'username': project.creator.email.split('@')[0] if project.creator.email else None,
                    'image': project.creator.profile_image
                },
                'status': project.status,
                'start_date': project.start_date.isoformat() if project.start_date else None,
                'end_date': project.end_date.isoformat() if project.end_date else None,
                'required_skills': project.required_skills,
                'max_members': project.max_members,
                'active_members': active_members,
                'is_full': project.max_members and active_members >= project.max_members,
                'category': project.category,
                'image_url': project.image_url,
                'created_at': project.createdAt.isoformat() if project.createdAt else None
            })

        return jsonify({
            'projects': projects_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        logger.getChild('projects').error(f"Error obteniendo proyectos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Obtener detalles de un proyecto específico"""
    try:
        project = Project.query.filter_by(
            id=project_id,
            deletedAt=None
        ).first()

        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404

        # Verificar si es privado y el usuario no es miembro
        if not project.is_public and current_user.is_authenticated:
            member = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=current_user.id,
                deletedAt=None
            ).first()

            if not member and current_user.id != project.creator_id:
                return jsonify({'error': 'Acceso denegado'}), 403
        elif not project.is_public:
            return jsonify({'error': 'Acceso denegado'}), 403

        # Obtener miembros activos
        active_members = ProjectMember.query.filter_by(
            project_id=project_id,
            status='active',
            deletedAt=None
        ).all()

        members_data = []
        for member in active_members:
            members_data.append({
                'id': member.user.id,
                'name': f"{member.user.first_name} {member.user.last_name}",
                'username': member.user.email.split('@')[0] if member.user.email else None,
                'image': member.user.profile_image,
                'role': member.role,
                'joined_at': member.joined_at.isoformat() if member.joined_at else None
            })

        # Verificar si el usuario actual es miembro
        user_membership = None
        if current_user.is_authenticated:
            membership = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=current_user.id,
                deletedAt=None
            ).first()
            if membership:
                user_membership = {
                    'id': membership.id,
                    'role': membership.role,
                    'status': membership.status,
                    'joined_at': membership.joined_at.isoformat() if membership.joined_at else None
                }

        project_data = {
            'id': project.id,
            'title': project.title,
            'description': project.description,
            'creator': {
                'id': project.creator.id,
                'name': f"{project.creator.first_name} {project.creator.last_name}",
                'username': project.creator.email.split('@')[0] if project.creator.email else None,
                'image': project.creator.profile_image
            },
            'status': project.status,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'end_date': project.end_date.isoformat() if project.end_date else None,
            'required_skills': project.required_skills,
            'max_members': project.max_members,
            'is_public': project.is_public,
            'category': project.category,
            'image_url': project.image_url,
            'members': members_data,
            'stats': {
                'active_members': len(members_data),
                'is_full': project.max_members and len(members_data) >= project.max_members
            },
            'user_membership': user_membership,
            'created_at': project.createdAt.isoformat() if project.createdAt else None,
            'updated_at': project.updatedAt.isoformat() if project.updatedAt else None
        }

        return jsonify(project_data), 200

    except Exception as e:
        logger.getChild('projects').error(f"Error obteniendo proyecto: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/projects', methods=['POST'])
@login_required
def create_project():
    """Crear un nuevo proyecto"""
    try:
        data = request.get_json()

        # Validar campos requeridos
        if not data or 'title' not in data:
            return jsonify({'error': 'Campo requerido: title'}), 400

        # Crear proyecto
        project = Project(
            title=data['title'],
            description=data.get('description'),
            creator_id=current_user.id,
            status=data.get('status', 'draft'),
            required_skills=data.get('required_skills', []),
            max_members=data.get('max_members'),
            is_public=data.get('is_public', True),
            category=data.get('category'),
            image_url=data.get('image_url')
        )

        # Fechas opcionales
        if 'start_date' in data and data['start_date']:
            try:
                project.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'error': 'Formato de fecha de inicio inválido'}), 400

        if 'end_date' in data and data['end_date']:
            try:
                project.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except:
                return jsonify({'error': 'Formato de fecha de fin inválido'}), 400

        db.session.add(project)
        db.session.commit()

        # Auto-agregar al creador como owner
        member = ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            role='owner',
            status='active',
            joined_at=datetime.now(timezone.utc)
        )
        db.session.add(member)
        db.session.commit()

        return jsonify({
            'message': 'Proyecto creado correctamente',
            'project': {
                'id': project.id,
                'title': project.title,
                'status': project.status
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error creando proyecto: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al crear el proyecto'}), 500


@bp.route('/api/v1/projects/<int:project_id>', methods=['PUT'])
@login_required
def update_project(project_id):
    """Actualizar un proyecto (solo el creador o owners)"""
    try:
        project = Project.query.filter_by(
            id=project_id,
            deletedAt=None
        ).first()

        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404

        # Verificar permisos
        member = ProjectMember.query.filter_by(
            project_id=project_id,
            user_id=current_user.id,
            role='owner',
            deletedAt=None
        ).first()

        if current_user.id != project.creator_id and not member:
            return jsonify({'error': 'No tienes permisos para editar este proyecto'}), 403

        data = request.get_json()

        # Actualizar campos
        if 'title' in data:
            project.title = data['title']

        if 'description' in data:
            project.description = data['description']

        if 'status' in data:
            if data['status'] not in ['draft', 'active', 'completed', 'cancelled']:
                return jsonify({'error': 'Estado inválido'}), 400
            project.status = data['status']

        if 'start_date' in data:
            if data['start_date']:
                try:
                    project.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
                except:
                    return jsonify({'error': 'Formato de fecha de inicio inválido'}), 400
            else:
                project.start_date = None

        if 'end_date' in data:
            if data['end_date']:
                try:
                    project.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
                except:
                    return jsonify({'error': 'Formato de fecha de fin inválido'}), 400
            else:
                project.end_date = None

        if 'required_skills' in data:
            project.required_skills = data['required_skills']

        if 'max_members' in data:
            project.max_members = data['max_members']

        if 'is_public' in data:
            project.is_public = data['is_public']

        if 'category' in data:
            project.category = data['category']

        if 'image_url' in data:
            project.image_url = data['image_url']

        db.session.commit()

        return jsonify({
            'message': 'Proyecto actualizado correctamente',
            'project': {
                'id': project.id,
                'title': project.title,
                'status': project.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error actualizando proyecto: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar el proyecto'}), 500


@bp.route('/api/v1/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    """Eliminar un proyecto (solo el creador) - soft delete"""
    try:
        project = Project.query.filter_by(
            id=project_id,
            creator_id=current_user.id,
            deletedAt=None
        ).first()

        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404

        # Soft delete
        project.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({'message': 'Proyecto eliminado correctamente'}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error eliminando proyecto: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al eliminar el proyecto'}), 500


# ==================== Gestión de Miembros ====================

@bp.route('/api/v1/projects/<int:project_id>/members', methods=['POST'])
@login_required
def add_member(project_id):
    """Agregar un miembro al proyecto o solicitar unirse"""
    try:
        project = Project.query.filter_by(
            id=project_id,
            deletedAt=None
        ).first()

        if not project:
            return jsonify({'error': 'Proyecto no encontrado'}), 404

        data = request.get_json()

        # Si se especifica user_id, es una invitación (solo owners)
        if 'user_id' in data:
            # Verificar permisos
            member = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=current_user.id,
                role='owner',
                deletedAt=None
            ).first()

            if current_user.id != project.creator_id and not member:
                return jsonify({'error': 'Solo los owners pueden invitar miembros'}), 403

            user_id = data['user_id']

            # Verificar que el usuario existe
            user = User.query.filter_by(
                id=user_id,
                is_enabled=True,
                deletedAt=None
            ).first()

            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            # Verificar si ya es miembro
            existing_member = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=user_id,
                deletedAt=None
            ).first()

            if existing_member:
                return jsonify({'error': 'El usuario ya es miembro del proyecto'}), 400

            # Crear membresía con estado pending
            new_member = ProjectMember(
                project_id=project_id,
                user_id=user_id,
                role=data.get('role', 'contributor'),
                status='pending'
            )

            db.session.add(new_member)
            db.session.commit()

            # Crear notificación
            notification = Notification(
                user_id=user_id,
                type='project_invitation',
                title='Invitación a proyecto',
                message=f"{current_user.first_name} {current_user.last_name} te ha invitado a '{project.title}'",
                link=f'/projects/{project_id}',
                data={'project_id': project_id, 'member_id': new_member.id}
            )
            db.session.add(notification)
            db.session.commit()

            return jsonify({
                'message': 'Invitación enviada correctamente',
                'member': {
                    'id': new_member.id,
                    'user_id': user_id,
                    'role': new_member.role,
                    'status': new_member.status
                }
            }), 201

        else:
            # El usuario se une por sí mismo (solo proyectos públicos)
            if not project.is_public:
                return jsonify({'error': 'Este proyecto es privado'}), 403

            # Verificar si hay cupo
            if project.max_members:
                active_count = ProjectMember.query.filter_by(
                    project_id=project_id,
                    status='active',
                    deletedAt=None
                ).count()

                if active_count >= project.max_members:
                    return jsonify({'error': 'El proyecto está lleno'}), 400

            # Verificar si ya es miembro
            existing_member = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=current_user.id,
                deletedAt=None
            ).first()

            if existing_member:
                return jsonify({'error': 'Ya eres miembro de este proyecto'}), 400

            # Crear membresía activa
            new_member = ProjectMember(
                project_id=project_id,
                user_id=current_user.id,
                role='contributor',
                status='active',
                joined_at=datetime.now(timezone.utc)
            )

            db.session.add(new_member)
            db.session.commit()

            # Notificar al creador
            notification = Notification(
                user_id=project.creator_id,
                type='project_member_joined',
                title='Nuevo miembro en proyecto',
                message=f"{current_user.first_name} {current_user.last_name} se ha unido a '{project.title}'",
                link=f'/projects/{project_id}',
                data={'project_id': project_id, 'user_id': current_user.id}
            )
            db.session.add(notification)
            db.session.commit()

            return jsonify({
                'message': 'Te has unido al proyecto correctamente',
                'member': {
                    'id': new_member.id,
                    'role': new_member.role,
                    'status': new_member.status
                }
            }), 201

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error agregando miembro: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al agregar miembro'}), 500


@bp.route('/api/v1/projects/members/<int:member_id>/respond', methods=['PUT'])
@login_required
def respond_membership(member_id):
    """Responder a una invitación de proyecto"""
    try:
        member = ProjectMember.query.filter_by(
            id=member_id,
            user_id=current_user.id,
            status='pending',
            deletedAt=None
        ).first()

        if not member:
            return jsonify({'error': 'Invitación no encontrada'}), 404

        data = request.get_json()
        action = data.get('action')  # 'accept' o 'decline'

        if action not in ['accept', 'decline']:
            return jsonify({'error': 'Acción inválida (accept o decline)'}), 400

        if action == 'accept':
            member.status = 'active'
            member.joined_at = datetime.now(timezone.utc)
            message = 'Te has unido al proyecto correctamente'
        else:
            member.deletedAt = datetime.now(timezone.utc)
            message = 'Has rechazado la invitación'

        db.session.commit()

        # Notificar al creador del proyecto
        project = Project.query.get(member.project_id)
        if project:
            notification = Notification(
                user_id=project.creator_id,
                type='membership_response',
                title='Respuesta a invitación',
                message=f"{current_user.first_name} {current_user.last_name} ha {action}ado la invitación a '{project.title}'",
                link=f'/projects/{project.id}',
                data={'project_id': project.id, 'action': action}
            )
            db.session.add(notification)
            db.session.commit()

        return jsonify({'message': message}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error respondiendo invitación: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al responder la invitación'}), 500


@bp.route('/api/v1/projects/<int:project_id>/members/<int:user_id>', methods=['PUT'])
@login_required
def update_member_role(project_id, user_id):
    """Actualizar rol de un miembro (solo owners)"""
    try:
        # Verificar permisos
        owner_member = ProjectMember.query.filter_by(
            project_id=project_id,
            user_id=current_user.id,
            role='owner',
            deletedAt=None
        ).first()

        project = Project.query.get(project_id)

        if current_user.id != project.creator_id and not owner_member:
            return jsonify({'error': 'Solo los owners pueden cambiar roles'}), 403

        # Obtener miembro a actualizar
        member = ProjectMember.query.filter_by(
            project_id=project_id,
            user_id=user_id,
            deletedAt=None
        ).first()

        if not member:
            return jsonify({'error': 'Miembro no encontrado'}), 404

        data = request.get_json()
        new_role = data.get('role')

        if new_role not in ['owner', 'collaborator', 'contributor']:
            return jsonify({'error': 'Rol inválido'}), 400

        member.role = new_role
        db.session.commit()

        return jsonify({
            'message': 'Rol actualizado correctamente',
            'member': {
                'id': member.id,
                'user_id': user_id,
                'role': new_role
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error actualizando rol: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al actualizar el rol'}), 500


@bp.route('/api/v1/projects/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
@login_required
def remove_member(project_id, user_id):
    """Remover un miembro del proyecto o salirse (soft delete)"""
    try:
        # Verificar permisos
        is_self = user_id == current_user.id

        if not is_self:
            owner_member = ProjectMember.query.filter_by(
                project_id=project_id,
                user_id=current_user.id,
                role='owner',
                deletedAt=None
            ).first()

            project = Project.query.get(project_id)

            if current_user.id != project.creator_id and not owner_member:
                return jsonify({'error': 'Solo los owners pueden remover miembros'}), 403

        member = ProjectMember.query.filter_by(
            project_id=project_id,
            user_id=user_id,
            deletedAt=None
        ).first()

        if not member:
            return jsonify({'error': 'Miembro no encontrado'}), 404

        # Soft delete
        member.status = 'left'
        member.left_at = datetime.now(timezone.utc)
        member.deletedAt = datetime.now(timezone.utc)
        db.session.commit()

        message = 'Has salido del proyecto' if is_self else 'Miembro removido correctamente'

        return jsonify({'message': message}), 200

    except Exception as e:
        db.session.rollback()
        logger.getChild('projects').error(f"Error removiendo miembro: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error al remover miembro'}), 500


# ==================== Mis Proyectos ====================

@bp.route('/api/v1/projects/my-projects', methods=['GET'])
@login_required
def get_my_projects():
    """Obtener proyectos creados por el usuario"""
    try:
        projects = Project.query.filter_by(
            creator_id=current_user.id,
            deletedAt=None
        ).order_by(Project.createdAt.desc()).all()

        projects_data = []
        for project in projects:
            active_members = ProjectMember.query.filter_by(
                project_id=project.id,
                status='active',
                deletedAt=None
            ).count()

            projects_data.append({
                'id': project.id,
                'title': project.title,
                'description': project.description,
                'status': project.status,
                'start_date': project.start_date.isoformat() if project.start_date else None,
                'end_date': project.end_date.isoformat() if project.end_date else None,
                'required_skills': project.required_skills,
                'active_members': active_members,
                'max_members': project.max_members,
                'is_public': project.is_public,
                'image_url': project.image_url,
                'created_at': project.createdAt.isoformat() if project.createdAt else None
            })

        return jsonify({
            'projects': projects_data,
            'total': len(projects_data)
        }), 200

    except Exception as e:
        logger.getChild('projects').error(f"Error obteniendo mis proyectos: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/projects/my-memberships', methods=['GET'])
@login_required
def get_my_memberships():
    """Obtener proyectos en los que el usuario es miembro"""
    try:
        memberships = ProjectMember.query.filter_by(
            user_id=current_user.id,
            status='active',
            deletedAt=None
        ).all()

        projects_data = []
        for membership in memberships:
            if membership.project.deletedAt is None:
                projects_data.append({
                    'membership_id': membership.id,
                    'role': membership.role,
                    'joined_at': membership.joined_at.isoformat() if membership.joined_at else None,
                    'project': {
                        'id': membership.project.id,
                        'title': membership.project.title,
                        'description': membership.project.description,
                        'status': membership.project.status,
                        'creator': {
                            'id': membership.project.creator.id,
                            'name': f"{membership.project.creator.first_name} {membership.project.creator.last_name}",
                            'username': membership.project.creator.email.split('@')[0] if membership.project.creator.email else None
                        },
                        'start_date': membership.project.start_date.isoformat() if membership.project.start_date else None,
                        'end_date': membership.project.end_date.isoformat() if membership.project.end_date else None,
                        'category': membership.project.category,
                        'image_url': membership.project.image_url
                    }
                })

        return jsonify({
            'memberships': projects_data,
            'total': len(projects_data)
        }), 200

    except Exception as e:
        logger.getChild('projects').error(f"Error obteniendo mis membresías: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500


@bp.route('/api/v1/projects/invitations/my-invitations', methods=['GET'])
@login_required
def get_my_project_invitations():
    """Obtener invitaciones pendientes a proyectos"""
    try:
        invitations = ProjectMember.query.filter_by(
            user_id=current_user.id,
            status='pending',
            deletedAt=None
        ).all()

        invitations_data = []
        for invitation in invitations:
            if invitation.project.deletedAt is None:
                invitations_data.append({
                    'id': invitation.id,
                    'role': invitation.role,
                    'project': {
                        'id': invitation.project.id,
                        'title': invitation.project.title,
                        'description': invitation.project.description,
                        'status': invitation.project.status,
                        'creator': {
                            'id': invitation.project.creator.id,
                            'name': f"{invitation.project.creator.first_name} {invitation.project.creator.last_name}",
                            'username': invitation.project.creator.email.split('@')[0] if invitation.project.creator.email else None,
                            'image': invitation.project.creator.profile_image
                        },
                        'required_skills': invitation.project.required_skills,
                        'category': invitation.project.category,
                        'image_url': invitation.project.image_url
                    },
                    'created_at': invitation.createdAt.isoformat() if invitation.createdAt else None
                })

        return jsonify({
            'invitations': invitations_data,
            'total': len(invitations_data)
        }), 200

    except Exception as e:
        logger.getChild('projects').error(f"Error obteniendo invitaciones: {str(e)}", exc_info=True)
        return jsonify({'error': 'Error interno'}), 500
