import { CpeApiData } from "@/services/cpeApi";
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Info, Tag, CalendarDays, Edit3, ListCollapse, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CpeDetailViewProps {
  cpeData: CpeApiData;
  cpeId: string;
}

const DataField: React.FC<{ label: string; value?: string | number | boolean | null; icon?: React.ReactNode; className?: string }> = ({
  label,
  value,
  icon,
  className,
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
          <p className="text-sm text-foreground break-all">{String(value)}</p>
        )}
      </div>
    </div>
  );
};

export function CpeDetailView({ cpeData, cpeId }: CpeDetailViewProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPPpp", { locale: es });
    } catch {
      return dateString;
    }
  };

  const knownKeys = ["deprecated", "cpeName", "cpeNameId", "lastModified", "created", "titles", "refs", "deprecatedBy"];
  
  const additionalData = Object.entries(cpeData)
    .filter(([key]) => !knownKeys.includes(key))
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, unknown>);

  return (
    <Card className="w-full shadow-lg h-full flex flex-col">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center text-xl md:text-2xl">
          <Tag className="mr-3 h-6 w-6 text-primary" />
          Detalles del CPE
        </CardTitle>
        <CardDescription className="break-all font-mono text-xs md:text-sm">{cpeId}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <DataField label="Nombre CPE" value={cpeData.cpeName} icon={<Info size={16} />} />
              <DataField label="ID Nombre CPE" value={cpeData.cpeNameId} icon={<Tag size={16} />} />
              <DataField label="Creado" value={formatDate(cpeData.created)} icon={<CalendarDays size={16} />} />
              <DataField label="Última Modificación" value={formatDate(cpeData.lastModified)} icon={<Edit3 size={16} />} />
              <DataField
                label="Deprecado"
                value={cpeData.deprecated}
                icon={cpeData.deprecated ? <AlertCircle size={16} className="text-destructive" /> : <CheckCircle2 size={16} className="text-green-600" />}
              />
            </div>

            <Accordion type="multiple" defaultValue={["titles", "refs"]} className="w-full">
              {cpeData.titles && cpeData.titles.length > 0 && (
                <AccordionItem value="titles">
                  <AccordionTrigger className="text-base font-semibold">
                    Títulos ({cpeData.titles.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pt-2">
                      {cpeData.titles.map((title, index) => (
                        <li key={index} className="p-3 bg-muted/50 rounded-md text-sm">
                          <span className="font-medium">{title.title}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{title.lang}</Badge>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {cpeData.refs && cpeData.refs.length > 0 && (
                <AccordionItem value="refs">
                  <AccordionTrigger className="text-base font-semibold">
                    Referencias ({cpeData.refs.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Referencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cpeData.refs.map((ref, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="secondary">{ref.type || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              <a
                                href={ref.ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all flex items-center"
                              >
                                {ref.ref}
                                <ExternalLink size={14} className="ml-1" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}

              {cpeData.deprecatedBy && cpeData.deprecatedBy.length > 0 && (
                <AccordionItem value="deprecatedBy">
                  <AccordionTrigger className="text-base font-semibold">
                    Deprecado Por ({cpeData.deprecatedBy.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pt-2">
                      {cpeData.deprecatedBy.map((dep, index) => (
                        <li key={index} className="p-3 bg-destructive/10 rounded-md text-sm border border-destructive/20">
                          <p className="font-medium">CPE: <span className="font-mono text-xs">{dep.cpeName}</span></p>
                          <p className="font-medium">ID: <span className="font-mono text-xs">{dep.cpeNameId}</span></p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {Object.keys(additionalData).length > 0 && (
                 <AccordionItem value="additionalData">
                  <AccordionTrigger className="text-base font-semibold">
                    <ListCollapse className="mr-2 h-5 w-5" />
                    Otros Datos
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    {Object.entries(additionalData).map(([key, value]) => (
                      <DataField
                        key={key}
                        label={key.charAt(0).toUpperCase() + key.slice(1)} 
                        value={typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                        className="border-b last:border-b-0"
                      />
                    ))}
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
