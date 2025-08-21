# tests/unit/run_tests.py

import unittest
import sys
import os

from sqlalchemy import create_engine

# Añadir el directorio raíz al path para que se puedan importar todos los módulos correctamente
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from tests.unit.test_utils import CustomTestRunner
from config import TestConfig
from sqlalchemy_utils import database_exists, create_database

def setup_test_database():
    engine = create_engine(TestConfig.SQLALCHEMY_DATABASE_URI)
    if not database_exists(engine.url):
        create_database(engine.url)
    return engine

setup_test_database()


if __name__ == '__main__':
    loader = unittest.TestLoader()
    # Descubrir tests en el directorio actual (tests/unit)
    suite = loader.discover('.')
    runner = CustomTestRunner(verbosity=2)
    runner.run(suite)
