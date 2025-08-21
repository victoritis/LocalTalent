from datetime import datetime, timezone, timedelta
from operator import or_
import time
import requests
from app import db
from app.models import CVE, TasksInfo, Alert, Organization, Product, Match
from app.tasks.alerts import update_alerts_from_cves
from app.logger_config import logger
from flask import current_app

@current_app.celery.task
def cve_load(*args, **kwargs):
    """
    Tarea de carga inicial de CVEs desde NVD - Sincronización de CVEs
    """
    task_prefix = "CVE_LOAD"
    data_type = "CVEs"
    rate_limit_seconds = 6
    
    task_name_main = 'cve_load'
    other_main_tasks_to_clear = ['cpe_load', 'match_load']
    other_progress_tasks_to_clear = ['cve_load_progress', 'cpe_load_progress', 'match_load_progress']

    logger.getChild('celery').info(f"{task_prefix} - INICIO CARGA INICIAL - Sincronización de {data_type}")
    start_time_task = datetime.now(timezone.utc)

    try:
        # Mantener la limpieza de registros previos como estaba
        for task_name_to_clear in [task_name_main] + other_main_tasks_to_clear + other_progress_tasks_to_clear:
            task_to_clear = db.session.get(TasksInfo, task_name_to_clear)
            if task_to_clear:
                logger.getChild('celery').info(f"{task_prefix} - Eliminando registro TasksInfo para {task_name_to_clear} como parte del reinicio de carga.")
                db.session.delete(task_to_clear)
        db.session.commit()

        # Crear registro PRINCIPAL directamente, no _progress
        logger.getChild('celery').info(f"{task_prefix} - Creando registro principal TasksInfo para {task_name_main}.")
        task_info = TasksInfo(name=task_name_main, load_percentage=0, last_update=start_time_task)
        db.session.add(task_info)
        db.session.commit()
        
        api_key = current_app.config['NIST_API_KEY']
        base_url = current_app.config['NVD_URL_CVE']
        results_per_page = 2000
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
                task_info_on_error = db.session.get(TasksInfo, task_name_main)
                if task_info_on_error:
                    task_info_on_error.load_percentage = -1 
                    task_info_on_error.last_update = datetime.now(timezone.utc)
                    db.session.commit()
                return f"{task_prefix} - Fallo en API: No se actualizaron los {data_type}"

            processed, _ = process_cve_batch(data, task_prefix, data_type)
            total_procesados += processed

            total_results = data.get("totalResults", 0)
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
        task_info_on_error = db.session.get(TasksInfo, task_name_main)
        if task_info_on_error:
            task_info_on_error.load_percentage = -1
            task_info_on_error.last_update = current_time_on_error
            db.session.commit()
        return f"{task_prefix} - Error: {str(e)}"


# Renombrar fetch_cves_page a fetch_data_page y añadir task_prefix, data_type
def fetch_data_page(url, headers, start_index, per_page, max_retries, timeout, task_prefix, data_type, extra_params=None):
    """Obtiene una página de datos (CVEs, CPEs, Matches) con retry logic"""
    params = {"startIndex": start_index, "resultsPerPage": per_page}
    if extra_params:
        params.update(extra_params)

    for intento in range(1, max_retries + 1):
        try:
            response = requests.get(url, headers=headers, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.getChild('celery').warning(f"{task_prefix} - Intento {intento}/{max_retries} fallido al obtener {data_type}: {str(e)}") # Añadir prefijo y tipo
            if intento < max_retries:
                time.sleep(5 * intento)

    logger.getChild('celery').error(f"{task_prefix} - Fallo definitivo al obtener {data_type}") # Añadir prefijo y tipo
    return None


@current_app.celery.task
def cve_incremental_update():
    """
    Tarea para actualización incremental de CVEs desde NVD
    """
    task_prefix = "CVE_UPDATE"
    data_type = "CVEs"
    rate_limit_seconds = 6
    # Para la actualización incremental, nos basamos en 'cve_load' para la fecha de última actualización.
    # No se modifica el load_percentage aquí ni se usa 'cve_load_progress'.
    task_name_main_ref = 'cve_load' 

    logger.getChild('celery').info(f"{task_prefix} - INICIO ACTUALIZACIÓN INCREMENTAL - Sincronización de {data_type}")
    try:
        # Paso 1: Verificar existencia de la tarea principal de carga en TasksInfo
        task_info_main = db.session.get(TasksInfo, task_name_main_ref)
        if not task_info_main:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de {data_type} ({task_name_main_ref}) no realizada - abortando actualización periódica")
            return f"Tarea {task_name_main_ref} no registrada - abortando ejecución"
        
        # Verificar también cpe_load y match_load como antes, ya que son prerrequisitos
        # Estos no usan el esquema _progress para la actualización incremental.
        task_info_cpe_load = db.session.get(TasksInfo, 'cpe_load')
        if not task_info_cpe_load:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de CPEs no realizada - abortando actualización periódica")
            return "Tarea cpe_load no registrada - abortando ejecución"
        task_info_match_load = db.session.get(TasksInfo, 'match_load')
        if not task_info_match_load:
            logger.getChild('celery').warning(f"{task_prefix} - Carga inicial de MATCH no realizada - abortando actualización periódica")
            return "Tarea match_load no registrada - abortando ejecución"

        # Paso 2: Obtener marcas de tiempo
        current_time = datetime.now(timezone.utc) 
        last_update = task_info_main.last_update # Usamos last_update de la tarea 'cve_load'
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
        base_url = current_app.config['NVD_URL_CVE']
        results_per_page = 2000
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

            data = fetch_data_page( # Renombrada
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

            # Procesar lote actual
            processed_count, processed_cve_ids = process_cve_batch(data, task_prefix, data_type) # Renombrada y pasar prefijo/tipo
            total_processed += processed_count
            logger.getChild('celery').info(f"{task_prefix} - Lote procesado: {processed_count} {data_type}")

            # Calcular y registrar el progreso
            total_results = data.get("totalResults", 0)
            if total_results > 0:
                percentage_updated = (total_processed / total_results) * 100
                logger.getChild('celery').info(f"{task_prefix} - Progreso: {percentage_updated:.2f}% ({total_processed}/{total_results} {data_type})")
            else:
                logger.getChild('celery').info(f"{task_prefix} - Procesado: {total_processed} {data_type} (totalResults no disponible o 0)")
       
            # Actualizar alertas para los CVEs procesados
            if processed_cve_ids:
                try:
                    logger.getChild('celery').info(f"{task_prefix} - Actualizando alertas para {len(processed_cve_ids)} {data_type} nuevos/actualizados")
                    update_alerts_from_cves(processed_cve_ids)
                    logger.getChild('celery').info(f"{task_prefix} - Actualización de alertas completada")
                except Exception as alert_error:
                    logger.getChild('celery').error(f"{task_prefix} - Error actualizando alertas: {str(alert_error)}", exc_info=True)

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

        # Paso 6: Actualizar última ejecución en el registro de 'cve_load'
        task_info_main.last_update = task_info_update_timestamp 
        db.session.commit()

        actual_task_completion_time = datetime.now(timezone.utc) 
        logger.getChild('celery').info(f"{task_prefix} - ACTUALIZACIÓN INCREMENTAL EXITOSA - Total {data_type} procesados/actualizados: {total_processed}")
        logger.getChild('celery').info(f"{task_prefix} - FIN DE ACTUALIZACION REALIZADA A LAS: {actual_task_completion_time.isoformat()}") # Mensaje final estandarizado
        return f"{task_prefix} OK - {total_processed} {data_type} actualizados"

    except Exception as e:
        logger.getChild('celery').error(f"{task_prefix} - ERROR: {str(e)}", exc_info=True)
        db.session.rollback()
        return f"{task_prefix} - Error: {str(e)}"


# Renombrar process_batch a process_cve_batch y añadir task_prefix, data_type
def process_cve_batch(data, task_prefix, data_type):
    """Procesa un lote de CVEs y actualiza la base de datos"""
    processed = 0
    cve_ids = []
    item_id = None # Para logging de errores

    for vuln in data.get("vulnerabilities", []):
        cve_data = vuln.get("cve", {})
        item_id = cve_data.get("id", "ID_DESCONOCIDA") # Guardar ID para log
        if not item_id or item_id == "ID_DESCONOCIDA":
            continue

        cpe_matchs = []
        match_criteria = []

        # Procesar configuraciones CPE
        for conf in cve_data.get("configurations", []):
            for node in conf.get("nodes", []):
                for cpe in node.get("cpeMatch", []):
                    if cpe.get("vulnerable"):
                        cpe_matchs.append(cpe.get("criteria"))
                        match_criteria.append(cpe.get("matchCriteriaId"))

        # Extraer CVSS según prioridad
        cvss_score, cvss_version = extract_cvss(cve_data.get("metrics", {}))

        # Extraer vulnStatus
        vuln_status = cve_data.get("vulnStatus")

        try:
            published = datetime.fromisoformat(cve_data["published"].rstrip('Z')).replace(tzinfo=timezone.utc)
            last_modified = datetime.fromisoformat(cve_data["lastModified"].rstrip('Z')).replace(tzinfo=timezone.utc)

            cve = CVE(
                id=item_id, # Usar item_id
                published=published,
                last_modified=last_modified,
                data=cve_data,
                cpe_match=cpe_matchs,
                matchCriteriaId=match_criteria,
                cvss_score=cvss_score,
                cvss_version=cvss_version,
                status=vuln_status
            )

            db.session.merge(cve)
            processed += 1
            cve_ids.append(item_id) # Usar item_id

        except Exception as e:
            logger.getChild('celery').error(f"{task_prefix} - Error procesando {data_type} {item_id}: {str(e)}") # Añadir prefijo y tipo
            db.session.rollback()

    try:
        db.session.commit()
        # logger.getChild('celery').info(f"{task_prefix} - Commit de lote exitoso") # Opcional, puede ser muy verboso
        return processed, cve_ids

    except Exception as e:
        logger.getChild('celery').error(f"{task_prefix} - Error en commit de lote de {data_type}: {str(e)}") # Añadir prefijo y tipo
        db.session.rollback()
        return 0, []

def extract_cvss(metrics):
    """Extrae la puntuación CVSS según prioridad de versiones"""
    cvss_priority = ['4.0', '3.1', '3.0', '2.0']
    
    # Buscar métricas primarias del NVD
    primary_metrics = []
    for metric_type in metrics:
        for entry in metrics[metric_type]:
            if entry.get("type") == "Primary":
                primary_metrics.append(entry)
    
    # Seleccionar la versión más reciente disponible
    for version in cvss_priority:
        for metric in primary_metrics:
            cvss_data = metric.get("cvssData", {})
            if cvss_data.get("version") == version:
                return cvss_data.get("baseScore"), version
    
    # Si no se encuentran métricas primarias
    secondary_versions = sorted(
        [m["cvssData"]["version"] for m in primary_metrics if m.get("cvssData")],
        key=lambda v: [float(n) for n in v.split('.')],
        reverse=True
    )
    
    if secondary_versions:
        version = secondary_versions[0]
        for metric in primary_metrics:
            if metric.get("cvssData", {}).get("version") == version:
                return metric["cvssData"].get("baseScore"), version
    
    return None, None

