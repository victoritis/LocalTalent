import { MatchItem } from "@/services/matchApi";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, CalendarDays, Edit3, ListCollapse, TagIcon, CheckCircle, ListFilter, Layers } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MatchDetailViewProps {
  matchDetail: MatchItem;
  matchCriteriaId: string;
}

const DataField: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode; className?: string; isCode?: boolean }> = ({
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
        <p className={`text-sm text-foreground break-words ${isCode ? "font-mono" : ""}`}>{String(value)}</p>
      </div>
    </div>
  );
};

const getStatusBadgeClass = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-300";
  switch (status.toUpperCase()) {
    case "ACTIVE": return "bg-green-100 text-green-700 border-green-300";
    case "INACTIVE": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-yellow-100 text-yellow-700 border-yellow-300";
  }
};

export function MatchDetailView({ matchDetail, matchCriteriaId }: MatchDetailViewProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPPpp", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full shadow-lg h-full flex flex-col">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center text-xl md:text-2xl">
          <ListFilter className="mr-3 h-6 w-6 text-primary" />
          Detalles del Criterio de Coincidencia
        </CardTitle>
        <CardDescription className="break-all font-mono text-xs md:text-sm">{matchCriteriaId}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-6 flex-1 overflow-hidden">
        <ScrollArea className="h-full md:pr-3">
          <div className="space-y-6 p-6 md:p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <DataField label="ID Criterio de Coincidencia" value={matchDetail.matchCriteriaId} icon={<TagIcon size={16} />} isCode />
              <DataField label="Criterio Match" value={matchDetail.criteria} icon={<Info size={16} />} isCode />
              <DataField label="Creado" value={formatDate(matchDetail.created)} icon={<CalendarDays size={16} />} />
              <DataField label="Última Modificación (Criterio)" value={formatDate(matchDetail.lastModified)} icon={<Edit3 size={16} />} />
              {matchDetail.cpeLastModified && <DataField label="Última Modificación (CPE)" value={formatDate(matchDetail.cpeLastModified)} icon={<Edit3 size={16} />} />}
              <div className="flex items-start space-x-2 py-2">
                 <CheckCircle size={16} className="text-muted-foreground mt-1" />
                 <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant="outline" className={`mt-1 text-xs ${getStatusBadgeClass(matchDetail.status)}`}>
                        {matchDetail.status || "Desconocido"}
                    </Badge>
                 </div>
              </div>
            </div>

            { (matchDetail.versionStartIncluding || matchDetail.versionStartExcluding || matchDetail.versionEndIncluding || matchDetail.versionEndExcluding) && (
                <Card className="bg-muted/40 shadow-sm">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-base flex items-center"><ListCollapse className="mr-2 h-5 w-5 text-primary/80" /> Versiones Afectadas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1 pt-0 px-4 pb-3">
                        {matchDetail.versionStartIncluding && <DataField label="Versión Inicial (Incluyendo)" value={matchDetail.versionStartIncluding} isCode />}
                        {matchDetail.versionStartExcluding && <DataField label="Versión Inicial (Excluyendo)" value={matchDetail.versionStartExcluding} isCode />}
                        {matchDetail.versionEndIncluding && <DataField label="Versión Final (Incluyendo)" value={matchDetail.versionEndIncluding} isCode />}
                        {matchDetail.versionEndExcluding && <DataField label="Versión Final (Excluyendo)" value={matchDetail.versionEndExcluding} isCode />}
                    </CardContent>
                </Card>
            )}
            
            {matchDetail.matches && matchDetail.matches.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-2 flex items-center">
                  <Layers className="mr-2 h-5 w-5 text-primary/80" /> CPEs Específicos Coincidentes ({matchDetail.matches.length})
                </h3>
                <Table className="mt-1 text-xs bg-background rounded-md shadow-inner">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nombre CPE</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">ID Nombre CPE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchDetail.matches.map((cpeMatch, index) => (
                      <TableRow key={cpeMatch.cpeNameId || index}>
                        <TableCell className="font-mono text-xs py-2 break-all">{cpeMatch.cpeName}</TableCell>
                        <TableCell className="font-mono text-xs py-2 hidden md:table-cell">{cpeMatch.cpeNameId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
