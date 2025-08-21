## test_auth.py
import os
import sys
# Añadir el directorio raíz al path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import unittest
import json
from tests.application.test_base import BaseTestCase
from app.models import User, JWTToken
from datetime import datetime, timezone
import pyotp
from app import db

class AuthTestCase(BaseTestCase):

    pass