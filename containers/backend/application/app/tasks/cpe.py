from datetime import datetime, timezone, timedelta
import time
from app import db
from app.models import CPE, TasksInfo
from app.logger_config import logger
from flask import current_app
from app.tasks.cve import fetch_data_page

@current_app.celery.task
def cpe_load(*args, **kwargs):
    """
    Tarea de carga inicial de CPEs desde NVD - Sincronización de CPEs
    """
    task_prefix = "CPE_LOAD"
    data_type = "CPEs"
    rate_limit_seconds = 6

    logger.getChild('celery').info(f"{task_prefix} - INICIO CARGA INICIAL - Sincronización de {data_type}")
    start_time_task = datetime.now(timezone.utc)

    try:
        # Crear registro PRINCIPAL
        logger.getChild('celery').info(f"{task_prefix} - Creando registro principal TasksInfo para cpe_load.")
        task_info = TasksInfo(name="cpe_load", load_percentage=0, last_update=start_time_task)
        db.session.add(task_info)
        db.session.commit()

        api_key = current_app.config['NIST_API_KEY']
        base_url = current_app.config['NVD_URL_CPE']
        results_per_page = 10000
        max_intentos = 15
        timeout = 10

        start_index = 0
        total_procesados = 0

        while True:
            loop_start_time = time.time()
            logger.getChild('celery').info(f"{task_prefix} - Obteniendo lote desde índice {start_index}")

            data = fetch_data_page(
                base_url,
                {"apiKey": api_key},
                start_index,
                results_per_page,
                max_intentos,
                timeout,
                task_prefix,
                data_type
            )

            if not data:
                logger.getChild('celery').error(f"{task_prefix} - Fallo definitivo al obtener {data_type}.")
                return f"{task_prefix} - Fallo en API: No se actualizaron los {data_type}"

            processed = process_cpe_batch(data, task_prefix, data_type)
            total_procesados += processed

            total_results = data.get("totalResults", 0)
            # Actualizar porcentaje en el registro principal
            if total_results > 0:
                percentage_downloaded = (total_procesados / total_results) * 100
                logger.getChild('celery').info(f"{task_prefix} - Progreso: {percentage_downloaded:.2f}% ({total_procesados}/{total_results} {data_type})")
                task_info.load_percentage = int(percentage_downloaded)
                task_info.last_update = datetime.now(timezone.utc)
                db.session.commit()
            else:
                logger.getChild('celery').info(f"{task_prefix} - Procesado: {total_procesados} {data_type} (totalResults no disponible o 0)")

            logger.getChild('celery').info(f"{task_prefix} - Lote procesado: {processed} {data_type}")

            start_index += results_per_page
            if start_index >= data.get("totalResults", 0):
                logger.getChild('celery').info(f"{task_prefix} - Llegado al final de los resultados")
                break

            elapsed_time = time.time() - loop_start_time
            wait_time = max(0, rate_limit_seconds - elapsed_time)

            if wait_time > 0:
                time.sleep(wait_time)
                logger.getChild('celery').info(f"{task_prefix} - Espera de rate limit completada ({wait_time:.2f}s)")
            else:
                logger.getChild('celery').info(f"{task_prefix} - Procesamiento tomó más de {rate_limit_seconds} segundos, continuando sin espera")

        # Al finalizar exitosamente
        end_time_task = datetime.now(timezone.utc)
        task_info.load_percentage = 100
        task_info.last_update = end_time_task
        db.session.commit()
        logger.getChild('celery').info(f"{task_prefix} - CARGA INICIAL EXITOSA - Total {data_type} procesados: {total_procesados}")
        logger.getChild('celery').info(f"{task_prefix} - FIN DE ACTUALIZACION REALIZADA A LAS: {end_time_task.isoformat()}")
        return f"{task_prefix} OK - {total_procesados} {data_type} procesados"

    except Exception as e:
        logger.getChild('celery').error(f"{task_prefix} - ERROR: {str(e)}", exc_info=True)
        db.session.rollback()
        # Actualizar el registro principal en caso de error
        current_time_on_error = datetime.now(timezone.utc)
        task_info_on_error = db.session.get(TasksInfo, "cpe_load")
        if task_info_on_error:
            task_info_on_error.load_percentage = -1
            task_info_on_error.last_update = current_time_on_error
            db.session.commit()
        return f"{task_prefix} - Error: {str(e)}"


@current_app.celery.task
def cpe_incremental_update():
    """
    Tarea para actualización incremental de CPEs desde NVD
    """
    task_prefix = "CPE_UPDATE"
    data_type = "CPEs"
    rate_limit_seconds = 6

    logger.getChild('celery').info(f"{task_prefix} - INICIO ACTUALIZACIÓN INCREMENTAL - Sincronización de {data_type}")
    try:
        # Paso 1: Verificar existencia de las tareas en TasksInfo de carga inicial
        task_info = TasksInfo.query.get('cpe_load')
        if not task_info:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de {data_type} no realizada - abortando actualización periódica")
            return "No se ha completado la carga - abortando ejecución"
        task_info_cve_load = TasksInfo.query.get('cve_load')
        if not task_info_cve_load:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de CVEs no realizada - abortando actualización periódica")
            return "No se ha completado la carga - abortando ejecución"
        task_info_match_load = TasksInfo.query.get('match_load')
        if not task_info_match_load:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de MATCH no realizada - abortando actualización periódica")
            return "No se ha completado la carga - abortando ejecución"

        # Paso 2: Obtener marcas de tiempo
        current_time = datetime.now(timezone.utc) # Hora de inicio de la actualización
        last_update = task_info.last_update
        if last_update and last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)

        # Determinar el timestamp para actualizar task_info.last_update
        # y el lastModEndDate para la llamada a la API
        task_info_update_timestamp = current_time
        api_last_mod_end_date = current_time

        if last_update:
            time_difference = current_time - last_update
            max_days_allowed = 100

            if time_difference.days > max_days_allowed:
                api_last_mod_end_date = last_update + timedelta(days=max_days_allowed)
                task_info_update_timestamp = api_last_mod_end_date

        # Configuración API
        api_key = current_app.config['NIST_API_KEY']
        base_url = current_app.config['NVD_URL_CPE']
        results_per_page = 10000
        max_retries = 15
        timeout = 10

        start_index = 0
        total_processed = 0
        has_more_results = True

        while has_more_results:
            loop_start_time = time.time()
            logger.getChild('celery').info(f"{task_prefix} - Obteniendo lote desde índice {start_index}")

            extra_params = {}
            if last_update:
                extra_params["lastModStartDate"] = last_update.isoformat()
                # Usar la fecha de finalización calculada para la API
                extra_params["lastModEndDate"] = api_last_mod_end_date.isoformat()

            data = fetch_data_page( # Usar función importada/renombrada
                base_url,
                {"apiKey": api_key},
                start_index,
                results_per_page,
                max_retries,
                timeout,
                task_prefix, # Pasar prefijo
                data_type, # Pasar tipo
                extra_params
            )

            if not data:
                logger.getChild('celery').error(f"{task_prefix} - Fallo definitivo al obtener {data_type}.")
                db.session.rollback()
                return f"{task_prefix} - Fallo en API: No se actualizaron los {data_type}"

            processed = process_cpe_batch(data, task_prefix, data_type) # Renombrada y pasar prefijo/tipo
            total_processed += processed

            total_results = data.get("totalResults", 0)
            if total_results > 0:
                percentage_updated = (total_processed / total_results) * 100
                logger.getChild('celery').info(f"{task_prefix} - Progreso: {percentage_updated:.2f}% ({total_processed}/{total_results} {data_type})")
            else:
                logger.getChild('celery').info(f"{task_prefix} - Procesado: {total_processed} {data_type} (totalResults no disponible o 0)")
            # Eliminar print duplicado
            # print(f"{task_prefix} - Progreso: {percentage_updated:.2f}% ({total_processed}/{total_results} {data_type})")

            logger.getChild('celery').info(f"{task_prefix} - Lote procesado: {processed} {data_type}")

            if start_index + results_per_page >= total_results:
                logger.getChild('celery').info(f"{task_prefix} - Llegado al final de los resultados")
                has_more_results = False
            else:
                start_index += results_per_page
                elapsed_time = time.time() - loop_start_time
                wait_time = max(0, rate_limit_seconds - elapsed_time)
                if wait_time > 0:
                    time.sleep(wait_time)
                    logger.getChild('celery').info(f"{task_prefix} - Espera de rate limit completada ({wait_time:.2f}s)")
                else:
                    logger.getChild('celery').info(f"{task_prefix} - Procesamiento tomó más de {rate_limit_seconds} segundos, continuando sin espera")

        # Actualizar última ejecución
        task_info.last_update = task_info_update_timestamp # Actualizar con el timestamp calculado
        db.session.commit()
        
        actual_task_completion_time = datetime.now(timezone.utc) # Hora real de fin de la tarea para el log
        logger.getChild('celery').info(f"{task_prefix} - ACTUALIZACIÓN INCREMENTAL EXITOSA - Total {data_type} procesados/actualizados: {total_processed}")
        logger.getChild('celery').info(f"{task_prefix} - FIN DE ACTUALIZACION REALIZADA A LAS: {actual_task_completion_time.isoformat()}") # Mensaje final estandarizado
        return f"{task_prefix} OK - {total_processed} {data_type} actualizados"

    except Exception as e:
        logger.getChild('celery').error(f"{task_prefix} - ERROR: {str(e)}", exc_info=True)
        db.session.rollback()
        return f"{task_prefix} - Error: {str(e)}"


# Renombrar process_batch a process_cpe_batch y añadir task_prefix, data_type
def process_cpe_batch(data, task_prefix, data_type):
    """Procesa un lote de CPEs y actualiza la base de datos"""
    processed = 0
    item_id = None # Para logging de errores

    for item in data.get("products", []):
        cpe_data = item.get("cpe", {})
        if not cpe_data:
            continue

        item_id = cpe_data.get('cpeName', 'ID_DESCONOCIDO') # Guardar ID para log

        try:
            # Convertir la fecha de creación y de última modificación de ISO a datetime
            published = datetime.fromisoformat(cpe_data["created"].rstrip('Z')).replace(tzinfo=timezone.utc)
            last_modified = datetime.fromisoformat(cpe_data["lastModified"].rstrip('Z')).replace(tzinfo=timezone.utc)

            # Crear o actualizar el objeto CPE
            cpe_obj = CPE(
                id=item_id, # Usar item_id
                published=published,
                last_modified=last_modified,
                cpeNameId=cpe_data.get("cpeNameId"),
                deprecated=cpe_data.get("deprecated", False),
                data=cpe_data
            )

            db.session.merge(cpe_obj)
            processed += 1

        except Exception as e:
            logger.getChild('celery').error(f"{task_prefix} - Error procesando {data_type} {item_id}: {str(e)}") # Usar item_id, prefijo y tipo
            db.session.rollback()

    try:
        db.session.commit()
        # logger.getChild('celery').info(f"{task_prefix} - Commit de lote exitoso") # Opcional
        return processed
    except Exception as e:
        logger.getChild('celery').error(f"{task_prefix} - Error en commit de lote de {data_type}: {str(e)}") # Añadir prefijo y tipo
        db.session.rollback()
        return 0