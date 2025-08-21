# ===== Stage de construcción de Caddy =====
FROM caddy:builder-alpine AS builder

RUN xcaddy build

# ===== Stage para desarrollo =====
FROM caddy:alpine AS development

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Crear usuario/grupo explícitamente (seguridad adicional)
RUN addgroup -S caddy && adduser -S -G caddy -H caddy \
    && mkdir -p /data /config \
    && chown -R caddy:caddy /data /config

# USER caddy   

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile", "--watch"]

# ===== Stage de producción =====
FROM caddy:alpine AS production

# Asegurar que el usuario/grupo existan antes de copiar archivos
RUN addgroup -S caddy && adduser -S -G caddy -H caddy

COPY --chown=caddy:caddy ./Caddyfile /etc/caddy/
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

RUN mkdir -p /data /config && chown -R caddy:caddy /data /config

# USER caddy   # ← COMENTAR o ELIMINAR para que Caddy siga siendo root

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
