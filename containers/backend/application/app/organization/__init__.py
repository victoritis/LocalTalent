from flask import Blueprint

bp = Blueprint('organization', __name__)

from app.organization import routes