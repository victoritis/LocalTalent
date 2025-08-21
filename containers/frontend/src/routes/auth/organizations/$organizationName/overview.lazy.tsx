import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, Box, Shield, Loader2, AlertTriangle, Plug, PlugZap, ShieldCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchOrganizationOverview } from "@/services/organizations/organizationApi";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createLazyFileRoute(
  "/auth/organizations/$organizationName/overview",
)({
  component: OrganizationDetails,
});

interface OverviewData {
  organization: {
    id: number;
    name: string;
    createdAt: string;
  };
  security_score: number;
  metrics: Array<{
    title: string;
    value: string;
    critical_value?: string;
  }>;
  recent_alerts: Array<{
    cve: string;
    cpe: string;
    active: boolean;
    date: string;
    cvss_score?: number;
    cvss_version?: string;
  }>;
  recent_inventory: Array<{
    cpe: string;
    date: string;
  }>;
  chart_data: {
    labels: Array<string>;
    datasets: Array<{
      label: string;
      data: Array<number>;
      borderColor: string;
      fill: boolean;
    }>;
  };
}

type OverviewResponse = OverviewData | { error: string };

function OrganizationDetails() {
  const { current_organization, roles } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<"alertas" | "cpes">("alertas");
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [rol, setRol] = useState<string>("user");

  const formatDateSafe = (dateString: string | null): string => {
    if (!dateString) return "Fecha no disponible";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      return format(date, "Pp", { locale: es });
    } catch (e) {
      console.error("Error formateando fecha:", e);
      return "Fecha inválida";
    }
  };

  useEffect(() => {
    if (roles.ROLE_SUPERADMIN) {
      setRol("Superadmin");
    } else if (roles.ROLE_ORG_ADMIN) {
      setRol("Org Admin");
    } else {
      setRol("User");
    }
  }, [roles]);

  useEffect(() => {
    if (!current_organization) return;

    async function getOverview(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        if (!current_organization) {
          setError("Organización no encontrada");
          setIsLoading(false);
          return;
        }
        const data = await fetchOrganizationOverview(
          current_organization.name,
        ) as OverviewResponse;

        if ("error" in data) {
          setError(data.error);
          setOverview(null);
        } else {
          setOverview(data);
        }
      } catch (err: unknown) {
        console.error("Error fetching overview:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido al obtener el resumen");
        }
        setOverview(null);
      } finally {
        setIsLoading(false);
      }
    }

    getOverview();
  }, [current_organization]);

  useEffect(() => {
    if (overview?.security_score == null) return;

    const targetPercentage = overview.security_score;

    const animate = () => {
      setAnimatedPercentage(prev => {
        if (prev < targetPercentage) {
          const diff = targetPercentage - prev;
          const increment = Math.max(1, Math.ceil(diff * 0.1));
          const nextValue = Math.min(prev + increment, targetPercentage);
          if (nextValue < targetPercentage) {
            requestAnimationFrame(animate);
          }
          return nextValue;
        }
        return targetPercentage;
      });
    };

    setAnimatedPercentage(0);
    requestAnimationFrame(animate);

    // No es necesario limpiar requestAnimationFrame ya que se encadena internamente
  }, [overview?.security_score]);

  const formatXAxis = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, "dd MMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatTooltipDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, "PPP", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formattedChartData = useMemo(() => {
    if (!overview?.chart_data?.labels || !overview?.chart_data?.datasets) {
      return [];
    }
    const { labels, datasets } = overview.chart_data;
    const activeDataset = datasets.find(ds =>
      (activeChart === "alertas" && ds.label === "Alertas por día") ||
      (activeChart === "cpes"    && ds.label === "Productos actualizados por día")
    );
    if (!activeDataset) return [];
    return labels.map((label, index) => ({
      date: label,
      value: activeDataset.data[index] ?? 0,
    }));
  }, [overview?.chart_data, activeChart]);

  const getBadgeClasses = (cvss_score?: number): string => {
    if (cvss_score == null) return "bg-gray-200 text-gray-800 hover:bg-gray-200";
    if (cvss_score < 4) return "bg-green-200 text-green-900 hover:bg-green-200";
    if (cvss_score < 7) return "bg-yellow-200 text-yellow-900 hover:bg-yellow-200";
    if (cvss_score < 9) return "bg-orange-300 text-orange-900 hover:bg-orange-300";
    return "bg-red-400 text-red-900 hover:bg-red-400";
  };

  const getThreatColor = (threatScore: number): string => {
    if (threatScore >= 90) return "hsl(0, 80%, 55%)"; // Rojo para alta amenaza
    if (threatScore >= 75) return "hsl(30, 100%, 50%)"; // Naranja
    if (threatScore >= 50) return "hsl(45, 100%, 50%)"; // Amarillo
    if (threatScore >= 25) return "hsl(120, 70%, 45%)"; // Verde claro
    return "hsl(210, 100%, 50%)"; // Azul para baja amenaza
  };

  if (!current_organization) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Selecciona una organización para ver el resumen.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-4 text-muted-foreground">Cargando resumen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-md">
        <h2 className="text-destructive font-semibold">Error al cargar el resumen</h2>
        <p className="text-sm text-destructive/90 mt-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Inténtalo de nuevo más tarde o contacta con el administrador si el problema persiste.
        </p>
      </div>
    );
  }

  if (!overview) {
    return <div className="p-6 text-muted-foreground">No hay datos disponibles para mostrar.</div>;
  }

  const { organization, metrics, recent_alerts, recent_inventory, security_score } = overview;

  const activeAlertsCount = metrics.find(m => m.title === "Alertas Totales")?.value ?? "0";
  const registeredCpesCount = metrics.find(m => m.title === "CPEs Registrados")?.value ?? "0";

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{organization.name}</h1>
          <p className="text-sm text-muted-foreground">
            Organización activa desde {format(parseISO(organization.createdAt), "yyyy", { locale: es })}
          </p>
        </div>
        <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
          ROL: {rol}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {metric.title === "Alertas Activas" ? (
                <div className="grid grid-cols-2 divide-x divide-border -mx-1">
                  <div className="px-1 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <div className="text-2xl font-bold">{metric.value}</div>
                  </div>
                  <div className="px-1 text-center">
                    <p className="text-xs text-red-600 flex items-center justify-center gap-1 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Críticas
                    </p>
                    <div className="text-2xl font-bold text-red-600">{metric.critical_value ?? "0"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{metric.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">

        <Card className="h-[300px] md:h-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Shield className="h-5 w-5" /> Nivel de Amenaza
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-70px)]">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="relative w-32 h-32 mb-4">
                <div className="absolute inset-0 rounded-full bg-muted/50"></div>
                <div
                  className="absolute inset-0 w-full h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    background: `conic-gradient(${getThreatColor(animatedPercentage)} ${animatedPercentage}%, transparent ${animatedPercentage}%)`,
                  }}
                />
                <div className="absolute inset-[10%] flex items-center justify-center">
                  <div className="bg-background w-full h-full rounded-full flex items-center justify-center shadow-inner">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold" style={{ color: getThreatColor(security_score) }}>
                        {security_score}%
                      </span>
                      {security_score === 0 && (
                        <ShieldCheck className="h-5 w-5 text-blue-500 mt-1" />
                      )}
                      {security_score >= 90 && (
                        <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse mt-1" />
                      )}
                      {security_score >= 50 && security_score < 90 && (
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-4 flex items-center gap-2">
                Basado en {registeredCpesCount} CPEs registrados, {activeAlertsCount} alertas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-[300px] md:h-auto flex flex-col">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Activity className="h-5 w-5" /> Tendencia (Últimos 30 días)
              </CardTitle>
              <div className="flex gap-2 self-end sm:self-center">
                <button
                  onClick={() => setActiveChart("alertas")}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm transition-colors ${
                    activeChart === "alertas"
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Alertas
                </button>
                <button
                  onClick={() => setActiveChart("cpes")}
                  className={`px-3 py-1 rounded-md text-xs sm:text-sm transition-colors ${
                    activeChart === "cpes"
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Nuevos CPEs
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 h-[calc(100%-80px)] pb-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formattedChartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                key={activeChart}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px" }}
                  labelFormatter={formatTooltipDate}
                  formatter={(value) => [`${value}`, activeChart === "alertas" ? "Alertas" : "Nuevos CPEs"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={
                    activeChart === "alertas"
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--primary))"
                  }
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-[300px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertCircle className="h-5 w-5" /> Alertas Recientes ({recent_alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-2">
            {recent_alerts.length > 0 ? (
              recent_alerts.map((alert) => (
                <div
                  key={`${alert.cve}-${alert.cpe}`}
                  className="flex items-start justify-between rounded-md border p-3 gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      {alert.active ? (
                        <Plug className="h-6 w-6 text-emerald-500 animate-pulse" aria-label="Activa" />
                      ) : (
                        <PlugZap className="h-6 w-6 text-slate-500" aria-label="Inactiva" />
                      )}
                    </div>
                    <div className="flex flex-1 justify-between items-start gap-2">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold truncate">{alert.cve}</span>
                          <div className="flex items-center flex-shrink-0">
                            <Badge className={`ml-2 px-1.5 py-0.5 whitespace-nowrap ${getBadgeClasses(alert.cvss_score)}`}>
                              <span className="text-sm font-semibold text-black">{alert.cvss_score ?? "-"}</span>
                              <span className="text-[10px] opacity-80 ml-1">V:{alert.cvss_version ?? "-"}</span>
                            </Badge>
                            {alert.active && alert.cvss_score && alert.cvss_score >= 9 && (
                              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse ml-1" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-semiboldline-clamp-1" title={alert.cpe}>
                          CPE: {alert.cpe}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap pt-1 flex-shrink-0">
                        {formatDateSafe(alert.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center pt-10">No hay alertas recientes.</p>
            )}
          </CardContent>
        </Card>

        <Card className="h-[300px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Box className="h-5 w-5" /> CPEs Añadidos Recientemente ({recent_inventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-2">
            {recent_inventory.length > 0 ? (
              recent_inventory.map((item) => (
                <div key={item.cpe} className="flex items-start justify-between rounded-md border p-3 gap-3 text-sm">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold" title={item.cpe}>{item.cpe}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                    {format(parseISO(item.date), "dd MMM yyyy", { locale: es })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center pt-10">No se han añadido CPEs recientemente.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default OrganizationDetails;
