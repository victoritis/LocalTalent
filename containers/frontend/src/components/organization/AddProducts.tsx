import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; 
import { Button } from "@/components/ui/button"; 
import { Label } from "@/components/ui/label"; 
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; 
import { CpeCombobox } from "../ui/CpeCombobox"; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; 
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; 
import {
  Loader2,
  PackagePlus,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  addProductToOrganization,
  fetchOrganizationProducts,
  OrganizationProduct, 
} from "@/services/organizations/organizationApi";
import { formatDistanceToNow } from "date-fns"; 
import { es } from "date-fns/locale";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] },
  },
};

const inputGroupVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.1, duration: 0.4, ease: "easeOut" },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.2, duration: 0.3, ease: "backOut" },
  },
};

const successSparkleVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.5, 1],
    opacity: [0, 1, 0],
    transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.5, 1] },
  },
};

const listVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.2, duration: 0.5, ease: "easeOut" },
  },
};

const PRODUCTS_PER_PAGE = 5;

export function AddProducts() {
  const { current_organization } = useAuth();
  const [cpeName, setCpeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccessSparkle, setShowSuccessSparkle] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const [products, setProducts] = useState<OrganizationProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProducts = useCallback(async (page: number) => {
    if (!current_organization?.name) return;

    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await fetchOrganizationProducts(
        current_organization.name,
        page,
        PRODUCTS_PER_PAGE,
        true 
      );
      if (response.error) {
        throw new Error(response.error);
      }
      setProducts(response.products);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar productos.";
      setProductsError(message);
      setProducts([]);
      toast.error("Error al cargar productos", { description: message });
    } finally {
      setProductsLoading(false);
    }
  }, [current_organization?.name]);

  useEffect(() => {
    if (current_organization?.name) {
      loadProducts(currentPage);
    } else {
      setProducts([]);
      setCurrentPage(1);
      setTotalPages(1);
      setProductsError(null);
    }
  }, [current_organization?.name, currentPage, loadProducts]);

  useEffect(() => {
    let successTimer: NodeJS.Timeout;
    if (isSuccess) {
      successTimer = setTimeout(() => setIsSuccess(false), 2000);
    }
    return () => clearTimeout(successTimer);
  }, [isSuccess]);

  useEffect(() => {
    let sparkleTimer: NodeJS.Timeout;
    if (showSuccessSparkle) {
      sparkleTimer = setTimeout(() => setShowSuccessSparkle(false), 800);
    }
    return () => clearTimeout(sparkleTimer);
  }, [showSuccessSparkle]);

  const validateCpeFormat = (value: string): boolean => {
    const trimmedValue = value.trim();
    return trimmedValue.startsWith("cpe:2.3:");
  };
  useEffect(() => {
    const trimmedValue = cpeName.trim();
    if (trimmedValue && !validateCpeFormat(trimmedValue)) {
      setInputError("Formato inválido. Debe comenzar con 'cpe:2.3:'.");
    } else {
      setInputError(null);
    }
  }, [cpeName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCpeName = cpeName.trim();

    if (!current_organization?.name) {
      toast.warning("Por favor, selecciona una organización primero.");
      return;
    }
    if (!trimmedCpeName) {
      toast.warning("Por favor, introduce o selecciona un nombre CPE.");
      return;
    }
    if (!validateCpeFormat(trimmedCpeName)) {
      setInputError("Formato inválido. Debe comenzar con 'cpe:2.3:'.");
      toast.error("Formato CPE inválido.", {
        description: "Asegúrate de que comience con 'cpe:2.3:'.",
      });
      return;
    }
    if (isLoading) return;

    setInputError(null);
    setIsLoading(true);
    setIsSuccess(false);

    const toastId = toast.loading("Añadiendo producto...", {
      description: `Procesando: ${trimmedCpeName}`,
    });

    try {
      const result = await addProductToOrganization(
        current_organization.name,
        trimmedCpeName,
      );

      if (result.status === "already_exists") {
        toast.info("Producto ya existente", {
          id: toastId,
          description: result.message,
          duration: 5000,
        });
      } else if (result.status === "restored" || result.status === "added") {
        setIsSuccess(true);
        setShowSuccessSparkle(true);
        toast.success(
          result.status === "restored" ? "Producto Restaurado" : "Producto Añadido", {
            id: toastId,
            description: result.message,
            duration: 5000,
        });
        setCpeName("");
        loadProducts(1);
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        console.warn("Respuesta inesperada del servidor:", result);
        throw new Error("Respuesta inesperada del servidor al añadir el producto.");
      }

    } catch (error) {
      console.error("Error adding product:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      toast.error("Error al añadir producto", {
        id: toastId,
        description: errorMessage,
        duration: 6000,
      });
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled =
    isLoading || !cpeName.trim() || !current_organization?.name || !!inputError;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const formatRelativeDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  if (!current_organization) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center text-muted-foreground p-6 gap-4"
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <Info className="h-12 w-12 text-blue-500 opacity-80" />
        <h3 className="text-xl font-semibold mt-2">Selecciona una Organización</h3>
        <p className="max-w-md">
          Debes seleccionar o crear una organización activa en el menú superior
          para poder gestionar sus productos asociados.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Add Product Card (lg:col-span-3) */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="relative lg:col-span-3"
        >
          <AnimatePresence>
            {showSuccessSparkle && (
              <motion.div
                className="absolute top-4 right-4 text-green-500 z-10"
                variants={successSparkleVariants}
                initial="initial"
                animate="animate"
                aria-hidden="true"
              >
                <Sparkles className="h-8 w-8" strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="shadow-lg border border-border/40 overflow-hidden bg-card h-full">
            <CardHeader className="bg-muted/40 p-6 border-b border-border/40">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                <PackagePlus className="h-6 w-6 text-primary" />
                <span>Añadir Nuevo Producto a {current_organization.name}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground text-sm">
                Introduce el CPE del producto para buscar vulnerabilidades.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  className="space-y-2"
                  variants={inputGroupVariants}
                >
                  <Label htmlFor="cpeName" className="font-medium flex items-center gap-1.5 text-sm">
                    Nombre CPE del Producto
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger type="button" aria-label="Información sobre formato CPE">
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs p-3 shadow-lg bg-popover text-popover-foreground">
                          <p className="font-semibold mb-1">Formato CPE v2.3:</p>
                          <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                            cpe:2.3:&lt;part&gt;:&lt;vendor&gt;:&lt;product&gt;:...
                          </code>
                          <p className="mt-2">Debe empezar por <code className="text-[11px] bg-muted px-1 py-0.5 rounded">'cpe:2.3:'</code>.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <CpeCombobox
                    value={cpeName}
                    onValueChange={setCpeName}
                    placeholder="Ej: cpe:2.3:a:apache:http_server:..."
                    searchPlaceholder="Buscar por fabricante, producto..."
                    emptyMessage="No se encontraron CPEs."
                    disabled={isLoading}
                    className={`w-full ${inputError ? "ring-2 ring-destructive ring-offset-2 ring-offset-background rounded-[--radius]" : ""}`}
                    aria-invalid={!!inputError}
                    aria-describedby="cpe-error"
                  />
                  <AnimatePresence>
                    {inputError && (
                      <motion.p
                        id="cpe-error"
                        className="text-sm text-destructive font-medium mt-2 flex items-center gap-1.5"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {inputError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="text-xs text-muted-foreground pt-1">
                    Puedes buscar CPEs en NVD o usar la autocompletación.
                  </p>
                </motion.div>

                <motion.div
                  className="flex justify-end pt-2"
                  variants={buttonVariants}
                >
                  <Button
                    type="submit"
                    className={`min-w-[160px] transition-all duration-300 ease-in-out ${isSuccess ? "bg-green-600 hover:bg-green-700" : ""}`}
                    disabled={isButtonDisabled}
                    size="lg"
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Procesando...
                        </motion.span>
                      ) : isSuccess ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="h-5 w-5" />
                          ¡Añadido!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <PackagePlus className="h-5 w-5" />
                          Añadir Producto
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Products Card (lg:col-span-2) */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={listVariants}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border border-border/40 overflow-hidden bg-card h-full flex flex-col">
            <CardHeader className="bg-muted/30 p-6 border-b border-border/40">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <List className="h-6 w-6 text-muted-foreground" />
                Productos Recientes
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground text-sm">
                Actividad en los últimos 30 días.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              {productsLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando productos...</span>
                </div>
              ) : productsError ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-destructive px-6 text-center gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="font-medium">Error al cargar</span>
                  <span className="text-sm">{productsError}</span>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground px-6 text-center gap-2">
                  <Info className="h-6 w-6 opacity-80" />
                  <span className="font-medium">No hay productos recientes</span>
                  <span className="text-sm">No se han añadido productos en los últimos 30 días.</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPE</TableHead>
                      <TableHead className="text-right w-[160px]">Últ. Actividad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.cpe} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs py-3 truncate max-w-[150px] sm:max-w-xs md:max-w-sm">
                          {product.cpe}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground py-3">
                          {formatRelativeDate(product.updated_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {totalPages > 1 && !productsLoading && !productsError && products.length > 0 && (
              <CardFooter className="p-4 border-t border-border/40 flex justify-center bg-muted/20 mt-auto">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                        aria-disabled={currentPage <= 1}
                        tabIndex={currentPage <= 1 ? -1 : undefined}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-4 py-2 text-sm font-medium">
                        Página {currentPage} de {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                        aria-disabled={currentPage >= totalPages}
                        tabIndex={currentPage >= totalPages ? -1 : undefined}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
