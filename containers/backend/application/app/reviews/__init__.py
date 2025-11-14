from flask import Blueprint

bp = Blueprint('reviews', __name__)

from app.reviews import routes
