import logging
from logging.handlers import RotatingFileHandler
import os

class FlushRotatingFileHandler(RotatingFileHandler):
    def emit(self, record):
        super().emit(record)
        self.flush()

def setup_logger():
    basedir = os.path.abspath(os.path.dirname(__file__))
    
    if os.environ.get('UNIT_TESTS', 'False').lower() == 'true':
        log_subdir = 'unit'
    elif os.environ.get('INTEGRATION_TESTS', 'False').lower() == 'true':
        log_subdir = 'integration'
    elif os.environ.get('APPLICATION_TESTS', 'False').lower() == 'true':
        log_subdir = 'application'
    else:
        log_subdir = '..'
    log_dir = os.path.join(basedir, f'./../logs/tests/{log_subdir}')
    os.makedirs(log_dir, exist_ok=True)

    max_bytes = 1024 * 1024 * 1024  # 1GB
    backup_count = 10
    formatter = logging.Formatter('%(asctime)s - [%(process)d] %(levelname)s: %(message)s [%(module)s:%(lineno)d - %(name)s]')

    main_logger = logging.getLogger('cve-sentinel')
    main_logger.setLevel(logging.INFO)
    main_logger.propagate = False

    loggers = {
        'roles': 'cve-sentinel.roles',
        'alerts': 'cve-sentinel.alerts',
        'navbar': 'cve-sentinel.navbar',
        'admin': 'cve-sentinel.admin',
        'celery': 'cve-sentinel.celery',
        'auth': 'cve-sentinel.auth',
        'email': 'cve-sentinel.email',
        'error': 'cve-sentinel.error',
        'main': 'cve-sentinel.main',
        'organization': 'cve-sentinel.organization',
        'user': 'cve-sentinel.user',
        'products': 'cve-sentinel.products'
    }

    handlers = {}

    for log_name, logger_name in loggers.items():
        logger_obj = logging.getLogger(logger_name)
        handler = FlushRotatingFileHandler(
            os.path.join(log_dir, f'{log_name}.log'),
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        handler.setFormatter(formatter)
        logger_obj.addHandler(handler)
        logger_obj.propagate = False
        handlers[log_name] = handler

    for handler in handlers.values():
        main_logger.addHandler(handler)

    return main_logger

logger = setup_logger()