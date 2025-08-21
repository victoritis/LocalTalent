import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  AlertTriangle,
  Info,
  ListChecks,
  Trash2,
  PlusCircle,
  PackageSearch,
  Search,
  Bell, // Import Bell icon
  BellOff, // Import BellOff icon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchOrganizationProducts,
  deleteOrganizationProduct,
  updateProductSettings, // Import the update function
  OrganizationProduct,
} from "@/services/organizations/organizationApi";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

const PRODUCTS_PER_PAGE = 10;

export function ListProducts() {
  const { current_organization } = useAuth();
  const [products, setProducts] = useState<OrganizationProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productToDelete, setProductToDelete] = useState<OrganizationProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  // State for updating settings dialog
  const [productToUpdateSettings, setProductToUpdateSettings] = useState<OrganizationProduct | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const loadProducts = useCallback(async (page: number, search: string) => {
    if (!current_organization?.name) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchOrganizationProducts(
        current_organization.name,
        page,
        PRODUCTS_PER_PAGE,
        false,
        search
      );
      if (response.error) {
        if (response.error.includes("not found") && search !== "") {
          setProducts([]);
          setCurrentPage(1);
          setTotalPages(0);
        } else {
          throw new Error(response.error);
        }
      } else {
        setProducts(response.products);
        setCurrentPage(response.page);
        setTotalPages(response.total_pages);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar productos.";
      setError(message);
      setProducts([]);
      setCurrentPage(1);
      setTotalPages(0);
      if (!(err instanceof Error && err.message.includes("not found") && search !== "")) {
        toast.error("Error al cargar productos", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [current_organization?.name]);

  useEffect(() => {
    if (current_organization?.name) {
      setSearchTerm("");
    } else {
      setProducts([]);
      setCurrentPage(1);
      setTotalPages(1);
      setError(null);
      setSearchTerm("");
    }
  }, [current_organization?.name]);

  useEffect(() => {
    if (current_organization?.name) {
      loadProducts(1, debouncedSearchTerm);
    }
  }, [current_organization?.name, debouncedSearchTerm, loadProducts]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !isLoading) {
      setCurrentPage(newPage);
      loadProducts(newPage, debouncedSearchTerm);
    }
  };

  const handleDeleteClick = (product: OrganizationProduct) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete || !current_organization?.name) return;

    setIsDeleting(true);
    const toastId = toast.loading(`Eliminando producto ${productToDelete.cpe}...`);

    try {
      const result = await deleteOrganizationProduct(
        current_organization.name,
        productToDelete.cpe,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(result.message || "Producto eliminado correctamente", {
        id: toastId,
        description: `${productToDelete.cpe} ha sido eliminado de ${current_organization.name}.`,
      });

      setProductToDelete(null);
      const newTotalItems = (totalPages * PRODUCTS_PER_PAGE) - 1;
      const newTotalPages = Math.ceil(newTotalItems / PRODUCTS_PER_PAGE);
      const pageToLoad = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
      loadProducts(pageToLoad, debouncedSearchTerm);
    } catch (error) {
      console.error("Error deleting product:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      toast.error("Error al eliminar producto", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const handleUpdateSettingsClick = (product: OrganizationProduct) => {
    setProductToUpdateSettings(product);
  };

  const confirmUpdateSettings = async () => {
    if (!productToUpdateSettings || !current_organization?.name) return;

    setIsUpdatingSettings(true);
    const newSendEmailValue = !productToUpdateSettings.send_email;
    const actionText = newSendEmailValue ? "activando" : "silenciando";
    const toastId = toast.loading(`${actionText} notificaciones para ${productToUpdateSettings.cpe}...`);

    try {
      const result = await updateProductSettings(
        current_organization.name,
        productToUpdateSettings.cpe,
        { send_email: newSendEmailValue }
      );

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(result.message || "Configuración actualizada correctamente", {
        id: toastId,
        description: `Notificaciones por email para ${productToUpdateSettings.cpe} ${newSendEmailValue ? "activadas" : "silenciadas"}.`,
      });

      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.cpe === productToUpdateSettings.cpe
            ? { ...p,
                send_email: newSendEmailValue,
                updated_at: result.product?.updated_at || p.updated_at
              }
            : p
        )
      );

    } catch (error) {
      console.error("Error updating product settings:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      toast.error("Error al actualizar configuración", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsUpdatingSettings(false);
      setProductToUpdateSettings(null);
    }
  };

  const formatRelativeDate = (dateString: string | null | undefined): string => { // Allow undefined
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
          para poder ver sus productos asociados.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <motion.div initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="shadow-lg border border-border/40 overflow-hidden bg-card">
          <CardHeader className="bg-muted/40 p-6 border-b border-border/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                <ListChecks className="h-6 w-6 text-primary" />
                <span>Productos de {current_organization.name}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground text-sm">
                Lista de todos los productos (CPEs) registrados en la organización.
              </CardDescription>
            </div>
            <div className="flex w-full md:w-auto gap-2 items-center">
              <div className="relative flex-grow md:flex-grow-0 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por CPE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={!current_organization || isLoading}
                />
              </div>
              <Link to="/auth/organizations/$organizationName/add-products" params={{ organizationName: current_organization.name }}>
                <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
                  <PlusCircle className="h-4 w-4" />
                  Añadir Producto
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0 min-h-[300px]">
            {isLoading && products.length === 0 && !error ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Cargando productos...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-destructive px-6 text-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                <span className="font-medium">Error al cargar productos</span>
                <span className="text-sm">{error}</span>
                <Button variant="outline" size="sm" onClick={() => loadProducts(1, debouncedSearchTerm)} className="mt-4">
                  Reintentar
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6 text-center gap-2">
                <PackageSearch className="h-10 w-10 opacity-70" />
                <span className="font-medium text-lg mt-2">
                  {debouncedSearchTerm ? `No se encontraron productos para "${debouncedSearchTerm}"` : "No hay productos registrados"}
                </span>
                <span className="text-sm max-w-sm">
                  {debouncedSearchTerm
                    ? "Intenta con otro término de búsqueda o revisa la lista completa."
                    : "Aún no se ha añadido ningún producto a esta organización. Empieza añadiendo uno."}
                </span>
                {!debouncedSearchTerm && (
                  <Link to="/auth/organizations/$organizationName/add-products" params={{ organizationName: current_organization.name }} className="mt-4">
                    <Button size="sm" className="gap-1.5">
                      <PlusCircle className="h-4 w-4" />
                      Añadir Primer Producto
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre CPE</TableHead>
                      <TableHead className="w-[180px]">Última Actualización</TableHead>
                      <TableHead className="text-right w-[140px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false}>
                      {products.map((product, index) => (
                        <motion.tr
                          key={product.cpe}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          custom={index}
                          layout
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-xs py-3 max-w-[200px] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl truncate">
                            <span title={product.cpe}>{product.cpe}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3">
                            {formatRelativeDate(product.updated_at)}
                          </TableCell>
                          <TableCell className="text-right py-3 space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${product.send_email ? "text-blue-500 hover:text-blue-600 hover:bg-blue-100/50" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                              onClick={() => handleUpdateSettingsClick(product)}
                              aria-label={product.send_email ? "Silenciar notificaciones por email" : "Activar notificaciones por email"}
                              title={product.send_email ? "Silenciar notificaciones por email" : "Activar notificaciones por email"}
                              disabled={isUpdatingSettings || isDeleting}
                            >
                              {product.send_email ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(product)}
                              aria-label={`Eliminar producto ${product.cpe}`}
                              title="Eliminar producto"
                              disabled={isDeleting || isUpdatingSettings}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {totalPages > 1 && !error && (
            <CardFooter className="p-4 border-t border-border/40 flex justify-center bg-muted/20">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                      aria-disabled={currentPage <= 1 || isLoading}
                      tabIndex={(currentPage <= 1 || isLoading) ? -1 : undefined}
                      className={(currentPage <= 1 || isLoading) ? "pointer-events-none opacity-50" : ""}
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
                      aria-disabled={currentPage >= totalPages || isLoading}
                      tabIndex={(currentPage >= totalPages || isLoading) ? -1 : undefined}
                      className={(currentPage >= totalPages || isLoading) ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          )}
        </Card>
      </motion.div>

      {productToDelete && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setProductToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el producto{" "}
                <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm break-words max-w-full inline-block align-middle">
                  {productToDelete?.cpe}
                </code>{" "}
                de la organización{" "}
                <strong>{current_organization?.name}</strong>. Las alertas asociadas
                a este producto también se desactivarán. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)} disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar Producto"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {productToUpdateSettings && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setProductToUpdateSettings(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar cambio de notificaciones</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres {productToUpdateSettings.send_email ? "silenciar" : "activar"} las
                notificaciones por correo electrónico para el producto{" "}
                <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm break-words max-w-full inline-block align-middle">
                  {productToUpdateSettings.cpe}
                </code>?
                {productToUpdateSettings.send_email
                  ? " No recibirás correos sobre nuevas alertas para este producto."
                  : " Volverás a recibir correos sobre nuevas alertas para este producto."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToUpdateSettings(null)} disabled={isUpdatingSettings}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmUpdateSettings}
                disabled={isUpdatingSettings}
                className={productToUpdateSettings.send_email ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90"}
              >
                {isUpdatingSettings ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  productToUpdateSettings.send_email ? "Silenciar Notificaciones" : "Activar Notificaciones"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
