from celery import Celery

def init_celery(app):
    celery = Celery(app.import_name, broker=app.config['REDIS_URL'])
    celery.conf.update(app.config)
    if 'beat_schedule' in app.config:
        celery.conf.beat_schedule = app.config['beat_schedule']
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
