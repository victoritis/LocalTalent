from flask import Blueprint

bp = Blueprint('rol', __name__)

from app.rol import routes