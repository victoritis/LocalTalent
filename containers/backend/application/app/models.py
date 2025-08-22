from flask_sqlalchemy import SQLAlchemy
from alembic import op
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import event
import uuid
import json
from app import db, login
from sqlalchemy.orm.attributes import get_history
from datetime import datetime, timezone
import sqlalchemy.orm as so
from typing import Optional
import sqlalchemy as sa
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import jwt
from flask import current_app
from time import time
import pyotp
import hashlib
from typing import Optional
from enum import Enum
from sqlalchemy.dialects.postgresql import JSON, JSONB, ARRAY

class AlertSeverity(Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

# Clase base para auditoría
class Base(db.Model):
    __abstract__ = True  # No se crea una tabla para esta clase directamente

    # Cambiar a funciones lambda para evaluar en tiempo de ejecución
    createdAt = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updatedAt = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deletedAt = db.Column(db.DateTime, nullable=True)


# Función para registrar eventos de auditoría
def record_base(mapper, connection, target, operation):
    """
    Función para actualizar los campos createdAt, updatedAt en función de la operación.
    """
    if operation == "INSERT":
        # Solo en el caso de INSERT se establece el campo createdAt
        target.createdAt = datetime.now(timezone.utc)

    elif operation == "UPDATE":
        # Solo en el caso de UPDATE se establece el campo updatedAt
        target.updatedAt = datetime.now(timezone.utc)

# Conectar los eventos de SQLAlchemy (asegurar que esto se ejecute)
@event.listens_for(Base, 'before_insert', propagate=True)
def receive_before_insert(mapper, connection, target):
    record_base(mapper, connection, target, "INSERT")

@event.listens_for(Base, 'before_update', propagate=True)
def receive_before_update(mapper, connection, target):
    record_base(mapper, connection, target, "UPDATE")

# Función para inicializar los oyentes de los eventos
def setup_base():
    # Modelos activos (sin organizaciones)
    for model in [User, JWTToken, Feedback]:
        event.listen(model, 'after_insert', lambda m, c, t: record_base(m, c, t, "INSERT"))
        event.listen(model, 'after_update', lambda m, c, t: record_base(m, c, t, "UPDATE"))

        #En vez de llamar a db.session.delete , hacemos     user.deletedAt = datetime.now(timezone.utc)()

# Auditoría de cambios
class Audit(db.Model):
    __tablename__ = 'audit'

    id = db.Column(db.Integer, primary_key=True)
    affected_table = db.Column(db.String(255), nullable=False)
    operation = db.Column(db.String(50), nullable=False)
    previous_data = db.Column(db.Text, nullable=True)  # Almacenado como JSON
    new_data = db.Column(db.Text, nullable=True)  # Almacenado como JSON
    date = db.Column(db.DateTime, default=db.func.now(), nullable=False)

#Para registrar cuando se haga un delete
def record_delete_audit(target):
    # Verificar que el objeto tiene el atributo __tablename__
    if not hasattr(target, '__tablename__'):
        raise ValueError("El objeto no tiene el atributo '__tablename__'")

    affected_table = target.__tablename__
    operation = "DELETE"

    # Filtrar las columnas que no deseas incluir en el registro de auditoría
    excluded_columns = {'createdAt', 'updatedAt', 'deletedAt'}

    # Obtener los valores actuales de los atributos excluyendo createdAt, updatedAt y deletedAt
    current_data = {
        attr.key: str(getattr(target, attr.key)) if isinstance(getattr(target, attr.key), uuid.UUID) else getattr(target, attr.key)
        for attr in target.__table__.columns
        if attr.key not in excluded_columns  # Excluir estas columnas
    }

    # Crear un registro de auditoría para el evento DELETE
    audit = Audit(
        affected_table=affected_table,
        operation=operation,
        previous_data=json.dumps(current_data),  # Los datos que se están eliminando
        new_data=None  # No hay nuevos datos en una operación DELETE
    )

    # Agregar a la sesión para ser persistido en la base de datos
    db.session.add(audit)
    db.session.commit()  # Confirmamos la transacción

from sqlalchemy.orm.properties import ColumnProperty
import json
from sqlalchemy.orm.attributes import get_history

# Función para registrar eventos de auditoría
def record_audit(mapper, connection, target):
    # Evitar doble registro al hacer soft‐delete (solo changed deletedAt)
    if hasattr(target, 'deletedAt') and get_history(target, 'deletedAt')[2]:
        return

    affected_table = target.__tablename__
    operation = "INSERT" if not db.inspect(target).persistent else "UPDATE"

    # Columnas a excluir de la auditoría
    excluded_columns = {'createdAt', 'updatedAt', 'deletedAt'}

    # Función auxiliar para serializar valores
    def serialize(val):
        if isinstance(val, datetime):
            return val.isoformat()
        elif isinstance(val, uuid.UUID):
            return str(val)
        return val

    # Serializamos los valores de las columnas (solo ColumnProperty)
    new_data = {
        attr.key: serialize(getattr(target, attr.key))
        for attr in mapper.attrs
        if isinstance(attr, ColumnProperty) and attr.key not in excluded_columns
    }

    previous_data = None
    if operation == "UPDATE":
        previous_data = {
            attr.key: serialize(get_history(target, attr.key)[2][0]) if get_history(target, attr.key)[2] else None
            for attr in mapper.attrs
            if isinstance(attr, ColumnProperty) and attr.key not in excluded_columns
        }

    audit = Audit(
        affected_table=affected_table,
        operation=operation,
        previous_data=json.dumps(previous_data) if previous_data else None,
        new_data=json.dumps(new_data)
    )

    db.session.add(audit)

# # Configuración de los oyentes para los modelos (auditoría)
def setup_audit():
    for model in [User, Feedback]:  
        event.listen(model, 'after_insert', record_audit)
        event.listen(model, 'after_update', record_audit)


#IMPORTANTE
#Para que la eliminacion de un registro quede registrada en la tabla de auditoria
def delete(target):

    target.deletedAt = datetime.now(timezone.utc)
    record_delete_audit(target)

    db.session.commit()  # Confirmar la eliminación en la base de datos
        
        

# Modelo Organization
## MODELO ELIMINADO: Organization


            
# Modelo User
class User(Base, UserMixin):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)  # Obligatorio
    first_name = db.Column(db.String(255), nullable=False)
    last_name = db.Column(db.String(255), nullable=False)
    otp_secret = db.Column(db.String(32), nullable=True)  # Secreto para 2FA
    is_enabled = db.Column(db.Boolean, default=False)  # Habilitado por defecto
    profile_image = db.Column(db.String(255), nullable=True, default='/static/default_profile.png')
    
    
    # Campo de roles especiales (conservado)
    special_roles = db.Column(db.ARRAY(db.String), default=[])

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return '<User {}>'.format(self.email)
    
    def get_reset_password_token(self, expires_in=600):
        
        payload = {
            'reset_password': self.email,
            'exp': time() + expires_in
        }
        
        token = jwt.encode(
            payload,
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return token

    @staticmethod
    def verify_reset_password_token(token):
        try:
            email = jwt.decode(token, current_app.config['SECRET_KEY'],
                            algorithms=['HS256'])['reset_password']
        except:
            return
        found_user = db.session.query(User).filter_by(email=email).first()

        return found_user
    
    def generate_otp_secret(self):
        if not self.otp_secret:
            self.otp_secret = pyotp.random_base32()
            db.session.commit()

    def get_otp_uri(self):
        return pyotp.totp.TOTP(self.otp_secret).provisioning_uri(
            name=self.email, 
            issuer_name="LocalTalent"
        )

    def verify_otp(self, otp_code):
        totp = pyotp.TOTP(self.otp_secret)
        return totp.verify(otp_code)
    
    def get_verification_token(self, expires_in=600) -> str:
        """
        Genera un token JWT que contiene el email del usuario y expira 
        en 'expires_in' segundos.
        """
        payload = {
            'verify_email': self.email,
            'exp': time() + expires_in
        }
        token = jwt.encode(
            payload,
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        return token

    @staticmethod
    def verify_verification_token(token: str):
        """
        Decodifica el token JWT y devuelve el objeto User asociado al email. 
        Si el token es inválido o expiró, retorna None.
        """
        try:
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            email = data['verify_email']
        except Exception:
            return None
        found_user = db.session.query(User).filter_by(email=email).first()
        return found_user
    
    # Métodos relacionados con organizaciones eliminados

@login.user_loader
def load_user(id):
    return db.session.get(User, int(id))



## MODELO ELIMINADO: OrgUser
    
    
    
    
class JWTToken(db.Model):
    __tablename__ = 'jwt_token'
    
    # Usamos un String con longitud 64 para almacenar el hash SHA256 (64 caracteres hexadecimales)
    id = db.Column(db.String(64), primary_key=True)
    expires_on = db.Column(db.DateTime, nullable=False)
    
    def __repr__(self):
        return f""
    
    @staticmethod
    def hash_token(token: str) -> str:
        """
        Calcula el hash SHA256 del token dado.
        """
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
    
    @classmethod
    def add(cls, token: str) -> "JWTToken":
        """
        Agrega un nuevo token JWT a la tabla o, si ya existe, actualiza la fecha de expiración.
        Se utiliza el hash del token como id para facilitar la búsqueda.
        """
        try:
            payload = jwt.decode(token, key=current_app.config['SECRET_KEY'], algorithms=["HS256"]) # Ajusta la clave y algoritmo según tu configuración
            expires_on = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        except jwt.ExpiredSignatureError:
            return None # Manejo de token expirado
        except jwt.DecodeError:
            return None # Manejo de token inválido
        
        hashed = cls.hash_token(token)
        instance = db.session.get(cls, hashed)  # Usando Session.get() en lugar de query.get()
        
        if instance:
            instance.expires_on = expires_on
        else:
            instance = cls(id=hashed, expires_on=expires_on)
            db.session.add(instance)
        
        db.session.commit()
        return instance
    
    @classmethod
    def find(cls, token: str) -> Optional["JWTToken"]:
        """
        Dado un token original, calcula su hash y busca si existe en la tabla.
        Retorna el objeto JWTToken o None si no se encuentra.
        """
        hashed = cls.hash_token(token)
        return db.session.get(cls, hashed)  # Usando Session.get() en lugar de query.get()
    
    
#No hereda de BAse porque no queremos registrar cada operacion de las CVEs
## MODELOS LEGACY ELIMINADOS: CVE

#No hereda de BAse porque no queremos registrar cada operacion de las CVEs
## MODELOS LEGACY ELIMINADOS: CPE
 
    
## MODELO LEGACY ELIMINADO: TasksInfo
    
    
    
## MODELO LEGACY ELIMINADO: Product
    
    

## MODELO LEGACY ELIMINADO: Alert
    
    
    

# Definir el modelo de la base de datos
## MODELO LEGACY ELIMINADO: Match

class Feedback(db.Model):
    __tablename__ = 'feedback'

    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    is_archived = db.Column(db.Boolean, default=False, nullable=False) 
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False) 

    def __repr__(self):
        return f'<Feedback {self.id}>'

# Registrar listeners una vez que todos los modelos (incluido Feedback) están definidos
setup_base()
setup_audit()



