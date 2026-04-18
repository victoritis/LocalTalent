"""Distancia geográfica con Haversine en SQL.

Issue #2 ya migró los cálculos críticos a SQL; aquí centralizamos la
expresión para que events/routes, user/routes y cualquier futuro listado
(ej. projects con ubicación) compartan la misma fórmula y no arrastren
bugs de conversión de grados.
"""

from sqlalchemy import func


EARTH_RADIUS_KM = 6371.0


def haversine_km_sql(lat_col, lon_col, lat_val, lon_val):
    """Devuelve una expresión SQLAlchemy con la distancia en km.

    `lat_col`/`lon_col` son columnas (p.ej. `Event.latitude`). `lat_val`/
    `lon_val` pueden ser escalares o columnas. Implementado con
    `acos(sin·sin + cos·cos·cos(Δλ)) · R`, sin PostGIS.
    """
    lat1 = func.radians(lat_col)
    lat2 = func.radians(lat_val)
    lon1 = func.radians(lon_col)
    lon2 = func.radians(lon_val)
    return (
        func.acos(
            func.sin(lat1) * func.sin(lat2)
            + func.cos(lat1) * func.cos(lat2) * func.cos(lon2 - lon1)
        )
        * EARTH_RADIUS_KM
    )


def haversine_filter(query, lat_col, lon_col, lat_val, lon_val, radius_km):
    """Filtra `query` a filas cuya distancia a `(lat_val, lon_val)` ≤ `radius_km`.

    Devuelve una tupla `(query_filtrada, distance_expr)` donde
    `distance_expr` se puede usar para ordenar y proyectar.
    """
    distance_expr = haversine_km_sql(lat_col, lon_col, lat_val, lon_val)
    return query.filter(distance_expr <= radius_km), distance_expr
