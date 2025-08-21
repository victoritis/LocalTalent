from time import time
from app import db
from app.models import CVE, Match, Product, Alert, Organization, CPE, User, OrgUser
from app.logger_config import logger
from flask import current_app, render_template
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone
from app.email.notifications import send_new_alerts_notification

active_states = ["Analyzed", "Modified", "Reserved", "Deferred"]
non_active = ["Rejected", "Awaiting Analysis", "Discontinued", "Obsolete"]


#Función para crear o restaurar una alerta 
def _create_or_restore_alert(session, org_id, cve_id, cpe_name, now):
    """
    Busca una alerta existente (incluyendo soft-deleted/inactivas).
    Si existe, la restaura (activa=True, deletedAt=None, actualiza updatedAt).
    Si no existe, la crea (activa=True, establece createdAt y updatedAt).
    Devuelve el objeto Alert y un estado ('created', 'restored', 'no_change').
    """
    existing_alert = session.query(Alert).execution_options(include_soft_deleted=True).filter_by(
        org=org_id,
        cve=cve_id,
        cpe=cpe_name
    ).first()

    if existing_alert:
        was_modified = not existing_alert.active or existing_alert.deletedAt is not None
        if was_modified:
            existing_alert.active = True
            existing_alert.deletedAt = None
            existing_alert.updatedAt = now
            session.add(existing_alert) # Asegurar que se rastree el cambio
            logger.getChild('celery').debug(f"Restaurando alerta existente: Org {org_id}, CVE {cve_id}, CPE {cpe_name}")
            return existing_alert, 'restored'
        else:
            # No actualizamos updatedAt si no hay cambio lógico para evitar ruido innecesario.
            logger.getChild('celery').debug(f"Alerta ya activa y no borrada encontrada: Org {org_id}, CVE {cve_id}, CPE {cpe_name}. Sin cambios lógicos.")
            return existing_alert, 'no_change'
    else:
        new_alert = Alert(
            org=org_id,
            cve=cve_id,
            cpe=cpe_name,
            active=True,
            createdAt=now, # Establecer createdAt solo para nuevas alertas
            updatedAt=now
        )
        session.add(new_alert)
        logger.getChild('celery').debug(f"Creando nueva alerta: Org {org_id}, CVE {cve_id}, CPE {cpe_name}")
        return new_alert, 'created'


def _get_critical_cves_count(session, cve_ids_list):
    """
    Cuenta cuántos CVEs de una lista tienen un CVSS score >= 9.0.
    """
    if not cve_ids_list:
        return 0
    
    critical_count = 0
    # Consultar los CVEs para obtener sus scores
    # Es importante manejar el caso donde cve.cvss_score podría ser None
    cves_in_db = session.query(CVE).filter(CVE.id.in_(cve_ids_list)).all()
    for cve_obj in cves_in_db:
        if cve_obj.cvss_score is not None:
            try:
                if float(cve_obj.cvss_score) >= 9.0:
                    critical_count += 1
            except ValueError:
                logger.getChild('celery').warning(f"ALERT_UPDATE - CVSS score no es un número flotante válido para CVE {cve_obj.id}: {cve_obj.cvss_score}")
    return critical_count


def update_alerts_from_cves(cves_id):
    """
    1. Busca la CVE por su ID
    2. Obtiene los matchCriteriaId asociados
    3. Busca en la tabla Match los CPEs afectados
    4. Compara con todos los productos registrados en la base de datos
    5. Crea o restaura alertas usando _create_or_restore_alert
    6. Acumula alertas nuevas/restauradas y envía notificaciones por correo al final.
    """
    total_cves = len(cves_id)
    processed_count = 0
    alerts_created_total = 0
    alerts_restored_total = 0
    commit_needed = False
    # Diccionario para acumular alertas nuevas/restauradas por org y producto
    alerts_by_org_product = {}

    logger.getChild('celery').info(f"ALERT_UPDATE - INICIO DE ACTUALIZACIÓN DE ALERTAS DESDE CVEs - Total a procesar: {total_cves}")
    results = []
    now = datetime.now(timezone.utc) 

    for cve_id in cves_id:
        loop_start_time = time()
        try:
            cve = db.session.query(CVE).get(cve_id)
            if not cve:
                logger.getChild('celery').warning(f"ALERT_UPDATE - CVE {cve_id} no encontrada en la base de datos")
                results.append({
                    "error": "CVE no encontrada en la base de datos",
                    "cve_id": cve_id
                })
                continue
            if cve.status not in active_states:
                continue
            match_criteria_ids = cve.matchCriteriaId
            if not match_criteria_ids:
                results.append({
                    "message": "CVE no tiene matchCriteriaId asociados.",
                    "cve_id": cve_id
                })
                continue
            matches = db.session.query(Match).filter(
                Match.matchCriteriaId.in_(match_criteria_ids)
            ).all()
            if not matches:
                logger.getChild('celery').debug(f"ALERT_UPDATE - No se encontraron coincidencias en Match para CVE {cve_id} con matchCriteriaIds: {match_criteria_ids}")
                results.append({
                    "message": "No se encontraron coincidencias en la tabla Match para esta CVE",
                    "cve_id": cve_id
                })
                continue
            affected_cpes = set()
            for match in matches:
                affected_cpes.update(match.cpeName)
            if not affected_cpes:
                logger.getChild('celery').debug(f"ALERT_UPDATE - No se extrajeron CPEs de los matches para CVE {cve_id}")
                results.append({
                    "message": "No se extrajeron CPEs de los matches encontrados",
                    "cve_id": cve_id
                })
                continue
            # Buscar productos activos (no soft-deleted) que coincidan con los CPEs afectados
            affected_products = db.session.query(Product).filter(
                Product.cpe.in_(affected_cpes),
                Product.deletedAt.is_(None) # Asegurarse de que el producto esté activo
            ).all()
            if not affected_products:
                logger.getChild('celery').debug(f"ALERT_UPDATE - No se encontraron productos ACTIVOS registrados afectados por CVE {cve_id}")
                results.append({
                    "message": "No se encontraron productos activos registrados afectados por esta CVE",
                    "cve_id": cve_id
                })
                continue

            alerts_created_cve = 0
            alerts_restored_cve = 0
            affected_orgs = set()

            for product in affected_products:
                org_id = product.org
                affected_orgs.add(org_id)

                alert_obj, status = _create_or_restore_alert(db.session, org_id, cve_id, product.cpe, now)

                if status == 'created':
                    alerts_created_cve += 1
                    commit_needed = True
                    # Acumular para correo
                    #Es un diccionario con un diccionario dentro, setDefault lo hago para que lo cree si no existe
                    #Asi luego me es mucho mas facil diferenciar por organización y por producto
                    alerts_by_org_product.setdefault(org_id, {}).setdefault(product.cpe, set()).add(cve_id)
                elif status == 'restored':
                    alerts_restored_cve += 1
                    commit_needed = True
                    # Acumular para correo
                    alerts_by_org_product.setdefault(org_id, {}).setdefault(product.cpe, set()).add(cve_id)

            alerts_created_total += alerts_created_cve
            alerts_restored_total += alerts_restored_cve

            results.append({
                "success": True,
                "message": f"Proceso completado para CVE {cve_id}",
                "cve_id": cve_id,
                "affected_cpes": list(affected_cpes),
                "affected_organizations": list(affected_orgs),
                "alerts_created": alerts_created_cve,
                "alerts_restored": alerts_restored_cve # Cambiado de alerts_updated
            })
            processed_count += 1

        except Exception as e:
            db.session.rollback() # Rollback por CVE individual
            logger.getChild('celery').error(f"ALERT_UPDATE - Error en procesamiento de CVE {cve_id}: {str(e)}", exc_info=True)
            results.append({
                "error": "Error al procesar la actualización de CPEs desde CVE",
                "cve_id": cve_id,
                "message": str(e)
            })

    # Commit global al final si hubo cambios
    if commit_needed:
        try:
            db.session.commit()
            logger.getChild('celery').info(f"ALERT_UPDATE EXITOSO - Commit global realizado. CVEs procesadas: {processed_count}. Alertas creadas: {alerts_created_total}, Alertas restauradas: {alerts_restored_total}")

            # --- Envío de correos después del commit ---
            logger.getChild('celery').info(f"ALERT_UPDATE - Iniciando envío de correos para {len(alerts_by_org_product)} organizaciones afectadas.")
            for org_id, products_data in alerts_by_org_product.items():
                for product_cpe, cve_ids_set in products_data.items():
                    if cve_ids_set: # Asegurarse de que hay CVEs
                        try:
                            # No es necesario volver a consultar el producto aquí,
                            # la función send_new_alerts_notification ya lo verifica.
                            cve_list_for_email = list(cve_ids_set)
                            critical_cves_count = _get_critical_cves_count(db.session, cve_list_for_email)
                            send_new_alerts_notification(
                                org_id,
                                product_cpe,
                                cve_list_for_email,
                                critical_alerts_count=critical_cves_count,
                                context='cve_update'
                            )
                        except Exception as e_email:
                            # Loggear error específico del envío para esta org/cpe
                            logger.getChild('celery').error(f"ALERT_UPDATE - Error al intentar enviar correo para Org {org_id}, CPE {product_cpe}: {e_email}", exc_info=True)
            logger.getChild('celery').info("ALERT_UPDATE - Envío de correos finalizado.")
            # --- Fin Envío de correos ---

        except Exception as ex:
            db.session.rollback()
            logger.getChild('celery').error(f"ALERT_UPDATE - Error al hacer commit global o enviar correos: {str(ex)}", exc_info=True)
            results.append({
                "error": "Error al hacer commit global o enviar correos",
                "message": str(ex)
            })
    else:
         logger.getChild('celery').info(f"ALERT_UPDATE COMPLETADO - No se realizaron cambios en alertas.")

    return results


@current_app.celery.task
def scan_from_added_product(org_id, cpe_name):
    """
    Busca vulnerabilidades asociadas a un producto existente y activo.
    Para cada vulnerabilidad encontrada, crea o restaura la alerta usando _create_or_restore_alert.
    Al final, envía SIEMPRE un correo de notificación si hubo alertas.
    """
    try:
        logger.getChild('celery').info(f"Iniciando escaneo de alertas para producto existente Org {org_id}, CPE: {cpe_name}")

        # --- Verificación Inicial (sin cambios) ---
        org = db.session.query(Organization).get(org_id)
        if not org:
            logger.getChild('celery').error(f"Error crítico: Organización {org_id} no encontrada al iniciar escaneo para CPE {cpe_name}.")
            return {"error": "Organización no encontrada", "code": "org_not_found_critical"}

        product = db.session.query(Product).filter_by(org=org_id, cpe=cpe_name).first()
        if not product:
            logger.getChild('celery').error(f"Error crítico: Producto {cpe_name} no encontrado en Org {org_id} al iniciar escaneo.")
            return {"error": "Producto no encontrado al iniciar escaneo", "code": "product_not_found_critical"}

        cpe_record = db.session.query(CPE).get(cpe_name)
        if not cpe_record:
            logger.getChild('celery').warning(f"CPE {cpe_name} no encontrado en la tabla CPE durante escaneo.")
            # Aunque no se encuentre el CPE, se podría querer notificar igual, ajusta si es necesario
            # Por ahora, mantenemos el retorno temprano
            return {"error": "CPE no encontrado en la base de datos", "cpe": cpe_name, "code": "cpe_not_found"}

        # --- Lógica Principal de Escaneo (sin cambios hasta obtener vulnerable_cves) ---
        matches = db.session.query(Match).filter(
            Match.cpeName.any(cpe_name)
        ).all()

        vulnerable_cves = []
        vulnerable_cves_ids = [] # Lista para guardar los IDs de CVEs encontradas

        if not matches:
            logger.getChild('celery').info(f"No se encontraron coincidencias en Match para CPE {cpe_name}.")
        else:
            match_criteria_ids = [m.matchCriteriaId for m in matches]
            if not match_criteria_ids:
                logger.getChild('celery').info(f"No hay matchCriteriaId para CPE {cpe_name}.")
            else:
                vulnerable_cves = db.session.query(CVE).filter(
                    CVE.matchCriteriaId.op("&&")(match_criteria_ids),
                    CVE.status.in_(active_states)
                ).all()
                vulnerable_cves_ids = [cve.id for cve in vulnerable_cves] # Guardar IDs
                logger.getChild('celery').info(f"CVEs encontradas para {cpe_name}: {vulnerable_cves_ids}")

        if not vulnerable_cves:
            logger.getChild('celery').info(f"No se encontraron CVEs vulnerables activas para CPE {cpe_name}.")
            # Continuamos para enviar el correo igualmente si el producto se acaba de añadir/restaurar

        logger.getChild('celery').info(f"Encontrados {len(vulnerable_cves)} CVEs vulnerables activas para CPE {cpe_name}")

        alerts_created_count = 0
        alerts_restored_count = 0
        now = datetime.now(timezone.utc)
        commit_needed = False
        newly_affected_cve_ids = set() # Guardar IDs de CVEs que causaron creación/restauración

        for cve in vulnerable_cves:
            alert_obj, status = _create_or_restore_alert(db.session, org_id, cve.id, cpe_name, now)

            if status == 'created':
                alerts_created_count += 1
                commit_needed = True
                newly_affected_cve_ids.add(cve.id)
            elif status == 'restored':
                alerts_restored_count += 1
                commit_needed = True
                newly_affected_cve_ids.add(cve.id)

        # --- Commit de Cambios en Alertas (si hubo) ---
        if commit_needed:
            try:
                db.session.commit()
                logger.getChild('celery').info(
                    f"Commit final realizado para Org {org_id}, CPE {cpe_name}. "
                    f"Creadas: {alerts_created_count}, Restauradas: {alerts_restored_count}"
                )
            except SQLAlchemyError as e_commit:
                 db.session.rollback()
                 logger.getChild('celery').error(f"Error en commit de alertas: {e_commit}", exc_info=True)
                 # Continuamos para intentar enviar los correos, pero marcamos fallo
                 commit_needed = False # Indicar que el commit falló
        else:
             logger.getChild('celery').info(f"No hubo cambios en alertas para Org {org_id}, CPE {cpe_name}. No se requiere commit.")


        # --- Envío de Correo (SIEMPRE, pero con la lista de CVEs nuevas/restauradas) ---
        email_sent_successfully = False
        # Solo intentar enviar si el commit fue exitoso o no fue necesario
        if commit_needed is not False: # Si commit_needed es True o None (no necesario)
            try:
                logger.getChild('celery').info(f"Intentando enviar correo de nuevo producto/alertas para Org {org_id}, CPE {cpe_name}")
                # Usar la nueva función generalizada con el contexto adecuado
                # Enviar la lista de CVEs que realmente causaron un cambio (creación/restauración)
                cve_list_for_email = list(newly_affected_cve_ids)
                critical_cves_count = _get_critical_cves_count(db.session, cve_list_for_email)
                send_new_alerts_notification(
                    org_id,
                    cpe_name,
                    cve_list_for_email,
                    critical_alerts_count=critical_cves_count,
                    context='new_product'
                )
                email_sent_successfully = True
                logger.getChild('celery').info(f"Correo de nuevo producto/alertas enviado exitosamente para Org {org_id}, CPE {cpe_name}")
            except Exception as e_email:
                logger.getChild('celery').error(f"Error al enviar correo de nuevo producto/alertas para Org {org_id}, CPE {cpe_name}: {e_email}", exc_info=True)
        else:
            logger.getChild('celery').warning(f"Envío de correo omitido para Org {org_id}, CPE {cpe_name} debido a error previo en commit.")


        # --- Resultado Final ---
        main_email_status = 'Enviado' if email_sent_successfully else ('Fallido' if commit_needed is not False else 'Omitido (Error Commit)')
        final_message = f"Escaneo completado para CPE {cpe_name}. Correo principal: {main_email_status}."

        return {
            "success": True, # La tarea se considera exitosa si llega aquí (incluso si el correo falla)
            "message": final_message,
            "cpe": cpe_name,
            "matches_found": len(matches),
            "vulnerable_cves_found": len(vulnerable_cves),
            "alerts_created": alerts_created_count,
            "alerts_restored": alerts_restored_count,
            "email_notification_sent": email_sent_successfully,
            # Devolver las CVEs que causaron cambio y se reportaron
            "alert_cves_reported_in_email": list(newly_affected_cve_ids)
        }

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.getChild('celery').error(f"Error de base de datos en scan_from_added_product para Org {org_id}, CPE {cpe_name}: {str(e)}", exc_info=True)
        return {"error": "Error de base de datos", "message": str(e), "code": "db_error"}
    except Exception as e:
        db.session.rollback()
        logger.getChild('celery').error(f"Error inesperado en scan_from_added_product para Org {org_id}, CPE {cpe_name}: {str(e)}", exc_info=True)
        return {"error": "Error interno del servidor", "message": str(e), "code": "internal_error"}