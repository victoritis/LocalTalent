## test_base.py
import os
import sys
import unittest
from sqlalchemy import text, create_engine  # Añade esta importación
from sqlalchemy_utils import database_exists, create_database
#Es muy importante asignar primero al valor a True, para que al importar create_app, que importa logger_config, sepa que es un test
os.environ['APPLICATION_TESTS'] = 'True'
from app import create_app, db
from config import TestConfig

# Añadir el directorio raíz al path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def setup_test_database():
    """Configura la base de datos de pruebas antes de cualquier test"""
    engine = create_engine(TestConfig.SQLALCHEMY_DATABASE_URI)
    
    if not database_exists(engine.url):
        print(f"\nCreando base de datos de pruebas: {engine.url.database}")
        create_database(engine.url)
        print("Base de datos creada exitosamente")
    else:
        print(f"\nUsando base de datos existente: {engine.url.database}")

    return engine

# Ejecutar la creación de la BD antes de cargar la app
setup_test_database()

class BaseTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configuración inicial para TODOS los tests
        cls.app = create_app(TestConfig)
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        
        # Crear tablas solo una vez por clase de test
        db.create_all()

    @classmethod
    def tearDownClass(cls):
        # Limpieza final después de TODOS los tests
        db.session.remove()
        cls.app_context.pop()

    def setUp(self):
        # Configuración antes de CADA test
        self.client = self.app.test_client()
        self.app.testing = True
        
        # Iniciar transacción para posible rollback
        self.connection = db.engine.connect()
        self.transaction = self.connection.begin()

    def tearDown(self):
        # Limpieza después de CADA test
        try:
            # Rollback de la transacción
            self.transaction.rollback()
            self.connection.close()
        except Exception as e:
            print(f"Error en limpieza: {str(e)}")
        
        # Limpiar datos de todas las tablas
        with self.app.app_context():
            for table in reversed(db.metadata.sorted_tables):
                db.session.execute(table.delete())
            db.session.commit()
            db.session.remove()



if __name__ == '__main__':
    unittest.main(verbosity=2)
