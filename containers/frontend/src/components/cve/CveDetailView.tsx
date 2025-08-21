import { CveItem, CvssMetric, CpeMatch } from "@/services/cveApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Info, CalendarDays, Edit3, ListCollapse, ExternalLink, ShieldAlert, FileText, Settings2, Link2, TagIcon, Users, Server, Smartphone, Workflow } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CveDetailViewProps {
  cveDetail: CveItem;
  cveId: string;
}

const DataField: React.FC<{ label: string; value?: string | number | boolean | null; icon?: React.ReactNode; className?: string; isCode?: boolean }> = ({
  label,
  value,
  icon,
  className,
  isCode = false,
}) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={`flex items-start space-x-2 py-2 ${className}`}>
      {icon && <div className="text-muted-foreground mt-1">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {typeof value === "boolean" ? (
          value ? (
            <Badge variant="outline" className="mt-1 bg-green-100 text-green-700 border-green-300">Sí</Badge>
          ) : (
            <Badge variant="outline" className="mt-1 bg-red-100 text-red-700 border-red-300">No</Badge>
          )
        ) : (
          <p className={`text-sm text-foreground break-words ${isCode ? "font-mono" : ""}`}>{String(value)}</p>
        )}
      </div>
    </div>
  );
};

const getSeverityBadgeClass = (severity?: string) => {
  if (!severity) return "bg-gray-100 text-gray-700 border-gray-300";
  switch (severity.toUpperCase()) {
    case "CRITICAL": return "bg-red-700 text-white border-red-900";
    case "HIGH": return "bg-red-500 text-white border-red-700";
    case "MEDIUM": return "bg-yellow-500 text-black border-yellow-700";
    case "LOW": return "bg-green-600 text-white border-green-800";
    default: return "bg-sky-500 text-white border-sky-700";
  }
};

const getAttackVectorIcon = (vector?: string) => {
  if (!vector) return <Info size={14} />;
  switch (vector.toUpperCase()) {
    case "NETWORK": return <span title="Network"><Server size={14} /></span>;
    case "ADJACENT_NETWORK": return <span title="Adjacent Network"><Workflow size={14} /></span>;
    case "LOCAL": return <span title="Local"><Smartphone size={14} /></span>;
    case "PHYSICAL": return <span title="Physical"><Users size={14} /></span>;
    default: return <Info size={14} />;
  }
};

export function CveDetailView({ cveDetail, cveId }: CveDetailViewProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPPpp", { locale: es });
    } catch {
      return dateString; 
    }
  };

  const renderCvssMetric = (metric: CvssMetric, index: number, type: string) => (
    <Card key={`${type}-${index}-${metric.source}`} className="mb-4 bg-muted/30 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Métrica CVSS ({metric.cvssData.version})</CardTitle>
          <Badge variant="outline" className="text-xs">{metric.type}</Badge>
        </div>
        <CardDescription className="text-xs">Fuente: {metric.source}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 pt-0 px-4 pb-4">
        <div className="flex justify-between items-center mb-1">
          <p className="font-semibold">Puntuación Base: {metric.cvssData.baseScore}</p>
          <Badge variant="default" className={`px-2 py-1 text-xs font-semibold ${getSeverityBadgeClass(metric.cvssData.baseSeverity)}`}>
            {metric.cvssData.baseSeverity}
          </Badge>
        </div>
        <p className="font-mono text-xs bg-background p-2 rounded-md break-all shadow-inner">{metric.cvssData.vectorString}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
          {metric.exploitabilityScore !== undefined && <p>Explotabilidad: <span className="font-semibold">{metric.exploitabilityScore}</span></p>}
          {metric.impactScore !== undefined && <p>Impacto: <span className="font-semibold">{metric.impactScore}</span></p>}
          {metric.cvssData.attackVector && <p className="flex items-center">Vector: {getAttackVectorIcon(metric.cvssData.attackVector)} <span className="ml-1">{metric.cvssData.attackVector}</span></p>}
          {metric.cvssData.attackComplexity && <p>Complejidad: <span className="font-semibold">{metric.cvssData.attackComplexity}</span></p>}
          {metric.cvssData.privilegesRequired && <p>Privilegios: <span className="font-semibold">{metric.cvssData.privilegesRequired}</span></p>}
          {metric.cvssData.userInteraction && <p>Interacción Usuario: <span className="font-semibold">{metric.cvssData.userInteraction}</span></p>}
          {metric.cvssData.scope && <p>Alcance: <span className="font-semibold">{metric.cvssData.scope}</span></p>}
          {metric.cvssData.confidentialityImpact && <p>Confidencialidad: <span className="font-semibold">{metric.cvssData.confidentialityImpact}</span></p>}
          {metric.cvssData.integrityImpact && <p>Integridad: <span className="font-semibold">{metric.cvssData.integrityImpact}</span></p>}
          {metric.cvssData.availabilityImpact && <p>Disponibilidad: <span className="font-semibold">{metric.cvssData.availabilityImpact}</span></p>}
        </div>
      </CardContent>
    </Card>
  );

  const renderCpeMatch = (cpeMatch: CpeMatch, index: number) => (
     <TableRow key={`${cpeMatch.matchCriteriaId}-${index}`}>
        <TableCell className="py-2">
          <Badge variant={cpeMatch.vulnerable ? "destructive" : "secondary"} className="text-xs">
            {cpeMatch.vulnerable ? "Vulnerable" : "No Vulnerable"}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-xs py-2 break-all">{cpeMatch.criteria}</TableCell>
        <TableCell className="text-xs py-2 hidden md:table-cell">{cpeMatch.matchCriteriaId}</TableCell>
         <TableCell className="text-xs py-2">
            {cpeMatch.versionStartIncluding && <span className="block">Desde (incl.): {cpeMatch.versionStartIncluding}</span>}
            {cpeMatch.versionStartExcluding && <span className="block">Desde (excl.): {cpeMatch.versionStartExcluding}</span>}
            {cpeMatch.versionEndIncluding && <span className="block">Hasta (incl.): {cpeMatch.versionEndIncluding}</span>}
            {cpeMatch.versionEndExcluding && <span className="block">Hasta (excl.): {cpeMatch.versionEndExcluding}</span>}
            {(!cpeMatch.versionStartIncluding && !cpeMatch.versionStartExcluding && !cpeMatch.versionEndIncluding && !cpeMatch.versionEndExcluding) && "-"}
         </TableCell>
    </TableRow>
  );


  return (
    <Card className="w-full shadow-lg h-full flex flex-col">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center text-xl md:text-2xl">
          <ShieldAlert className="mr-3 h-6 w-6 text-primary" />
          Detalles de la CVE
        </CardTitle>
        <CardDescription className="break-all font-mono text-xs md:text-sm">{cveId}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-6 flex-1 overflow-hidden">
        <ScrollArea className="h-full md:pr-3">
          <div className="space-y-6 p-6 md:p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <DataField label="ID CVE" value={cveDetail.id} icon={<TagIcon size={16} />} isCode />
              <DataField label="Identificador Fuente" value={cveDetail.sourceIdentifier} icon={<Info size={16} />} />
              <DataField label="Publicado" value={formatDate(cveDetail.published)} icon={<CalendarDays size={16} />} />
              <DataField label="Última Modificación" value={formatDate(cveDetail.lastModified)} icon={<Edit3 size={16} />} />
              <DataField label="Estado de Vulnerabilidad" value={cveDetail.vulnStatus} icon={<ListCollapse size={16} />} />
            </div>

            <Accordion type="multiple" defaultValue={["descriptions", "metrics", "weaknesses", "configurations", "references"]} className="w-full">
              {cveDetail.descriptions && cveDetail.descriptions.length > 0 && (
                <AccordionItem value="descriptions">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <FileText className="mr-2 h-5 w-5 text-primary/80" /> Descripciones ({cveDetail.descriptions.length})
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <ul className="space-y-3 pt-2">
                      {cveDetail.descriptions.map((desc, index) => (
                        <li key={index} className="p-3 bg-muted/50 rounded-md text-sm shadow-sm">
                          <Badge variant="outline" className="mb-1.5 text-xs">{desc.lang.toUpperCase()}</Badge>
                          <p className="text-foreground leading-relaxed">{desc.value}</p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {cveDetail.metrics && (Object.values(cveDetail.metrics).some(m => m && m.length > 0)) && (
                <AccordionItem value="metrics">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                     <ShieldAlert className="mr-2 h-5 w-5 text-primary/80" /> Métricas CVSS
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    {cveDetail.metrics.cvssMetricV31?.map((metric, idx) => renderCvssMetric(metric, idx, "v3.1"))}
                    {cveDetail.metrics.cvssMetricV30?.map((metric, idx) => renderCvssMetric(metric, idx, "v3.0"))}
                    {cveDetail.metrics.cvssMetricV2?.map((metric, idx) => renderCvssMetric(metric, idx, "v2.0"))}
                    {(!cveDetail.metrics.cvssMetricV31 && !cveDetail.metrics.cvssMetricV30 && !cveDetail.metrics.cvssMetricV2) && (
                        <p className="text-sm text-muted-foreground p-2">No hay métricas CVSS disponibles.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

              {cveDetail.weaknesses && cveDetail.weaknesses.length > 0 && (
                <AccordionItem value="weaknesses">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <AlertCircle className="mr-2 h-5 w-5 text-primary/80" /> Debilidades (CWE) ({cveDetail.weaknesses.length})
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <Table className="mt-2 text-xs">
                       <TableCaption className="text-xs mt-0">Lista de debilidades comunes (CWE) asociadas.</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fuente</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-xs">CWE ID (Idioma)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cveDetail.weaknesses.map((weakness, index) =>
                          weakness.description.map((desc, descIndex) => (
                            <TableRow key={`${index}-${descIndex}`}>
                              <TableCell className="py-2">{weakness.source}</TableCell>
                              <TableCell className="py-2"><Badge variant="secondary" className="text-xs">{weakness.type}</Badge></TableCell>
                              <TableCell className="font-mono text-xs py-2">{desc.value} ({desc.lang.toUpperCase()})</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}

              {cveDetail.configurations && cveDetail.configurations.length > 0 && (
                <AccordionItem value="configurations">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <Settings2 className="mr-2 h-5 w-5 text-primary/80" /> Configuraciones Afectadas
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    {cveDetail.configurations.map((config, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-md bg-muted/40 shadow-sm">
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Nodo de Configuración {index + 1} (Operador: {config.nodes[0]?.operator || "N/A"}
                          {config.nodes[0]?.negate ? ", Negado" : ""})
                        </p>
                        <Table className="text-xs bg-background rounded-md shadow-inner">
                           <TableCaption className="mt-1 text-xs">
                             {config.nodes[0]?.negate ? "Los siguientes CPEs NO están afectados si coinciden." : "Los siguientes CPEs están afectados si coinciden."}
                           </TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Estado</TableHead>
                              <TableHead className="text-xs">Criterio Match</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">ID Criterio</TableHead>
                              <TableHead className="text-xs">Versiones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.nodes.flatMap(node => node.cpeMatch.map((match, matchIdx) => renderCpeMatch(match, matchIdx)))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {cveDetail.references && cveDetail.references.length > 0 && (
                <AccordionItem value="references">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">
                    <Link2 className="mr-2 h-5 w-5 text-primary/80" /> Referencias ({cveDetail.references.length})
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <Table className="mt-2 text-xs">
                      <TableCaption className="text-xs mt-0">Enlaces a recursos externos y avisos.</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">URL</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Fuente</TableHead>
                          <TableHead className="text-xs">Etiquetas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cveDetail.references.map((ref, index) => (
                          <TableRow key={index}>
                            <TableCell className="py-2">
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all flex items-center text-xs"
                                title={ref.url}
                              >
                                <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">{ref.url}</span>
                                <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                              </a>
                            </TableCell>
                            <TableCell className="text-xs py-2 hidden md:table-cell truncate max-w-[150px]" title={ref.source}>{ref.source}</TableCell>
                            <TableCell className="py-2">
                              {ref.tags && ref.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {ref.tags.map((tag, tagIdx) => (
                                    <Badge key={tagIdx} variant="secondary" className="text-xs whitespace-nowrap">{tag}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
