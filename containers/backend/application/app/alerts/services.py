from app.models import Alert, CVE
from sqlalchemy import and_, or_, between
from app.logger_config import logger

def get_severity_from_cvss(score):
    """
    Determina la severidad según el puntaje CVSS.
    """
    if score is None:
        return "UNKNOWN"
    
    # CVSS 3.0/3.1 severity ratings
    if score >= 9.0:
        return "CRITICAL"
    elif score >= 7.0:
        return "HIGH"
    elif score >= 4.0:
        return "MEDIUM"
    elif score >= 0.1:
        return "LOW"
    else:
        return "UNKNOWN"

def filter_alerts_by_severity(query, severity):
    """
    Filtra las alertas por severidad basada en rangos CVSS.
    
    Args:
        query: SQLAlchemy query object
        severity: String indicando la severidad ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
        
    Returns:
        SQLAlchemy query modificado con el filtro apropiado
    """
    if severity == 'ALL':
        return query
        
    query = query.join(Alert.cve_info)  # Asegurarse de que hay un join con CVE
    
    if severity == 'CRITICAL':
        return query.filter(CVE.cvss_score >= 9.0)
    elif severity == 'HIGH':
        return query.filter(and_(CVE.cvss_score >= 7.0, CVE.cvss_score < 9.0))
    elif severity == 'MEDIUM':
        return query.filter(and_(CVE.cvss_score >= 4.0, CVE.cvss_score < 7.0))
    elif severity == 'LOW':
        return query.filter(and_(CVE.cvss_score >= 0.1, CVE.cvss_score < 4.0))
    else:
        # Para UNKNOWN, filtramos por NULL o 0
        return query.filter(or_(CVE.cvss_score == None, CVE.cvss_score < 0.1))
