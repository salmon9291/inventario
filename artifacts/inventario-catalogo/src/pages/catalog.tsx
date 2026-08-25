import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Filter,
  ImagePlus,
  Layers3,
  Menu,
  Package2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  TrendingUp,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react';
import {
  getGetProductSummaryQueryKey,
  getListProductsQueryKey,
  useCreateProduct,
  useDeleteProduct,
  useGetProductSummary,
  useListProducts,
  useUpdateProduct,
  type Product,
  type ProductInput,
} from '@workspace/api-client-react';

type FormValues = {
  name: string;
  sku: string;
  category: string;
  subcategories: Array<{ name: string; value: string }>;
  costPrice: number | '';
  salePrice: number | '';
  stock: number | '';
  imageUrl: string | null;
};

const emptyForm: FormValues = {
  name: '',
  sku: '',
  category: '',
  subcategories: [],
  costPrice: '',
  salePrice: '',
  stock: '',
  imageUrl: null,
};

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat('es-MX');

function formatCurrency(value: number) {
  return currency.format(value || 0).replace('MX', '').trim();
}

function errorText(error: unknown) {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  return 'No pudimos completar la operación. Intenta de nuevo.';
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function ProductAvatar({ product, size = 'normal' }: { product: Product; size?: 'normal' | 'large' }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--primary)/.1)] font-mono-data font-medium text-primary ${size === 'large' ? 'h-10 w-10 text-[11px]' : 'h-9 w-9 text-[10px]'}`}>
      {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : initials(product.name)}
    </div>
  );
}

function ProductDialog({
  open,
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Product | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [imageError, setImageError] = useState('');
  const [subcategoryError, setSubcategoryError] = useState('');

  useEffect(() => {
    if (!open) return;
    setImageError('');
    setSubcategoryError('');
    if (editing) {
      setForm({
        name: editing.name,
        sku: editing.sku,
        category: editing.category,
        subcategories: editing.subcategories ?? [],
        costPrice: editing.costPrice,
        salePrice: editing.salePrice,
        stock: editing.stock,
        imageUrl: editing.imageUrl,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  if (!open) return null;

  const update = (key: keyof FormValues, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: key === 'name' || key === 'sku' || key === 'category' ? value : Number(value),
    }));
  };

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Usa una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 1_000_000) {
      setImageError('La imagen debe pesar menos de 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, imageUrl: String(reader.result) }));
      setImageError('');
    };
    reader.readAsDataURL(file);
  };

  const updateSubcategory = (index: number, key: 'name' | 'value', value: string) => {
    setForm((current) => ({
      ...current,
      subcategories: current.subcategories.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
    setSubcategoryError('');
  };

  const addSubcategory = () => {
    setForm((current) => ({ ...current, subcategories: [...current.subcategories, { name: '', value: '' }] }));
    setSubcategoryError('');
  };

  const removeSubcategory = (index: number) => {
    setForm((current) => ({ ...current, subcategories: current.subcategories.filter((_, itemIndex) => itemIndex !== index) }));
    setSubcategoryError('');
  };

  const validateSubcategories = () => {
    const filled = form.subcategories.filter((item) => item.name.trim() || item.value.trim());
    if (filled.some((item) => !item.name.trim() || !item.value.trim())) {
      setSubcategoryError('Completa el tipo y el valor de cada subcategoría.');
      return false;
    }
    const keys = filled.map((item) => `${item.name.trim().toLocaleLowerCase()}::${item.value.trim().toLocaleLowerCase()}`);
    if (new Set(keys).size !== keys.length) {
      setSubcategoryError('Esa subcategoría ya existe en este producto.');
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--foreground)/.36)] p-0 sm:items-center sm:p-5" role="presentation">
      <div className="max-h-[100dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-card-border bg-card shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
        <div className="flex items-start justify-between border-b border-card-border px-5 py-4 sm:px-7">
          <div>
            <p className="font-mono-data text-[10px] uppercase tracking-[.18em] text-muted-foreground">
              {editing ? 'Editar registro' : 'Nuevo registro'}
            </p>
            <h2 id="product-dialog-title" className="mt-1 font-display text-2xl font-bold tracking-tight">
              {editing ? 'Ajustar producto' : 'Agregar producto'}
            </h2>
          </div>
          <button type="button" onClick={onClose} data-testid="button-close-product-dialog" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Cerrar formulario">
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (form.costPrice === '' || form.salePrice === '' || form.stock === '' || !validateSubcategories()) return;
            onSubmit({
              ...form,
              subcategories: form.subcategories.filter((item) => item.name.trim() && item.value.trim()).map((item) => ({ name: item.name.trim(), value: item.value.trim() })),
              costPrice: Number(form.costPrice),
              salePrice: Number(form.salePrice),
              stock: Number(form.stock),
            });
          }}
          className="space-y-5 px-5 py-5 sm:px-7 sm:py-6"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nombre</span>
              <input required minLength={1} value={form.name} onChange={(event) => update('name', event.target.value)} data-testid="input-product-name" className="field" placeholder="Ej. Libreta rayada" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">SKU</span>
              <input required value={form.sku} onChange={(event) => update('sku', event.target.value)} data-testid="input-product-sku" className="field font-mono-data uppercase" placeholder="LIB-042" />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Categoría</span>
            <input required value={form.category} onChange={(event) => update('category', event.target.value)} data-testid="input-product-category" className="field" placeholder="Papelería" />
          </label>
          <div className="rounded-xl border border-card-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Subcategorías</p>
                <p className="mt-1 text-xs text-muted-foreground">Agrega atributos como talla, color o material.</p>
              </div>
              <button type="button" onClick={addSubcategory} className="button-secondary h-8 px-3 text-xs" data-testid="button-add-subcategory"><Plus size={14} /> Agregar</button>
            </div>
            {form.subcategories.length > 0 && <div className="mt-3 space-y-2">
              {form.subcategories.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                <input value={item.name} onChange={(event) => updateSubcategory(index, 'name', event.target.value)} className="field h-9 min-w-0 text-sm" placeholder="Tipo: Talla" aria-label={`Tipo de subcategoría ${index + 1}`} data-testid={`input-subcategory-name-${index}`} />
                <input value={item.value} onChange={(event) => updateSubcategory(index, 'value', event.target.value)} className="field h-9 min-w-0 text-sm" placeholder="Valor: Mediana" aria-label={`Valor de subcategoría ${index + 1}`} data-testid={`input-subcategory-value-${index}`} />
                <button type="button" onClick={() => removeSubcategory(index)} className="icon-button shrink-0 text-destructive" aria-label={`Quitar subcategoría ${index + 1}`} data-testid={`button-remove-subcategory-${index}`}><X size={15} /></button>
              </div>)}
            </div>}
            {subcategoryError && <p className="mt-2 text-xs font-semibold text-destructive">{subcategoryError}</p>}
          </div>
          <div className="rounded-xl border border-dashed border-input bg-secondary/25 p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--primary)/.1)] text-primary">
                {form.imageUrl ? <img src={form.imageUrl} alt="Vista previa del producto" className="h-full w-full object-cover" /> : <ImagePlus size={21} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Imagen del producto <span className="font-normal text-muted-foreground">(opcional)</span></p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG o WebP · máximo 1 MB</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="button-secondary h-8 cursor-pointer px-3 text-xs">
                    <UploadCloud size={14} /> {form.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleImage(event.target.files?.[0])} />
                  </label>
                  {form.imageUrl && <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: null }))} className="text-xs font-semibold text-destructive">Quitar</button>}
                </div>
              </div>
            </div>
            {imageError && <p className="mt-2 text-xs font-semibold text-destructive">{imageError}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Costo · MXN</span>
              <input required min="0" step="0.01" type="number" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} data-testid="input-product-cost" className="field font-mono-data" placeholder="0.00" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Venta · MXN</span>
              <input required min="0" step="0.01" type="number" value={form.salePrice} onChange={(event) => update('salePrice', event.target.value)} data-testid="input-product-sale" className="field font-mono-data" placeholder="0.00" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Existencia</span>
              <input required min="0" step="1" type="number" value={form.stock} onChange={(event) => update('stock', event.target.value)} data-testid="input-product-stock" className="field font-mono-data" placeholder="0" />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-card-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} data-testid="button-cancel-product" className="button-secondary">Cancelar</button>
            <button type="submit" disabled={pending} data-testid="button-save-product" className="button-primary">
              {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent?: 'green' | 'coral' | 'lime' | 'blue';
}) {
  return (
    <article className="border-b border-card-border px-1 py-3 sm:border-b-0 sm:border-l sm:px-4 sm:py-1 first:sm:border-l-0">
      <div className={`mb-3 flex h-7 w-7 items-center justify-center rounded-md ${accent === 'coral' ? 'bg-[hsl(var(--accent)/.12)] text-accent' : accent === 'lime' ? 'bg-[hsl(var(--chart-3)/.14)] text-primary' : accent === 'blue' ? 'bg-[hsl(var(--chart-5)/.12)] text-[hsl(var(--chart-5))]' : 'bg-[hsl(var(--primary)/.1)] text-primary'}`}>
        {icon}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight" data-testid={`text-summary-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </article>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const low = product.stock <= 5;
  const margin = product.salePrice - product.costPrice;
  return (
    <div className="group grid grid-cols-[minmax(190px,1.8fr)_110px_105px_105px_110px_82px_88px] items-center gap-3 border-b border-card-border px-4 py-3.5 last:border-0 hover:bg-[hsl(var(--secondary)/.35)] sm:px-5" data-testid={`row-product-${product.id}`}>
      <div className="flex min-w-0 items-center gap-3">
        <ProductAvatar product={product} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{product.name}</p>
          <p className="font-mono-data mt-0.5 text-[10px] uppercase text-muted-foreground">{product.sku}</p>
        </div>
      </div>
      <div className="min-w-0">
        <span className="truncate text-xs text-muted-foreground">{product.category}</span>
        {product.subcategories.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{product.subcategories.map((item) => <span key={`${item.name}-${item.value}`} className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.name}: {item.value}</span>)}</div>}
      </div>
      <span className="font-mono-data text-right text-xs">{formatCurrency(product.costPrice)}</span>
      <span className="font-mono-data text-right text-xs font-medium">{formatCurrency(product.salePrice)}</span>
      <span className={`font-mono-data text-right text-sm font-medium ${low ? 'text-accent' : ''}`}>{number.format(product.stock)} {low && <AlertTriangle className="mb-0.5 ml-1 inline-block" size={13} />}</span>
      <span className="font-mono-data text-right text-xs text-primary">{formatCurrency(margin)}</span>
      <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={() => onEdit(product)} data-testid={`button-edit-product-${product.id}`} className="icon-button" title="Editar producto" aria-label={`Editar ${product.name}`}><Pencil size={15} /></button>
        <button type="button" onClick={() => onDelete(product)} data-testid={`button-delete-product-${product.id}`} className="icon-button text-destructive hover:bg-[hsl(var(--destructive)/.1)]" title="Eliminar producto" aria-label={`Eliminar ${product.name}`}><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function ProductMobileCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const low = product.stock <= 5;
  return (
    <article className="border-b border-card-border p-4 last:border-0" data-testid={`card-product-${product.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProductAvatar product={product} size="large" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{product.name}</p>
            <p className="font-mono-data mt-0.5 text-[10px] uppercase text-muted-foreground">{product.sku} · {product.category}</p>
            {product.subcategories.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{product.subcategories.map((item) => <span key={`${item.name}-${item.value}`} className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.name}: {item.value}</span>)}</div>}
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onEdit(product)} data-testid={`button-mobile-edit-product-${product.id}`} className="icon-button" aria-label={`Editar ${product.name}`}><Pencil size={15} /></button>
          <button type="button" onClick={() => onDelete(product)} data-testid={`button-mobile-delete-product-${product.id}`} className="icon-button text-destructive" aria-label={`Eliminar ${product.name}`}><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-secondary/55 p-3">
        <div><p className="label-mini">Venta</p><p className="font-mono-data mt-1 text-xs font-medium">{formatCurrency(product.salePrice)}</p></div>
        <div><p className="label-mini">Margen</p><p className="font-mono-data mt-1 text-xs text-primary">{formatCurrency(product.salePrice - product.costPrice)}</p></div>
        <div><p className="label-mini">Stock</p><p className={`font-mono-data mt-1 text-xs ${low ? 'font-bold text-accent' : ''}`}>{number.format(product.stock)} {low ? '· bajo' : ''}</p></div>
      </div>
    </article>
  );
}

export default function Catalog() {
  const queryClient = useQueryClient();
  const { data: products, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useListProducts();
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useGetProductSummary();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [notice, setNotice] = useState('');

  // Keep the catalog renderable if an unexpected response slips through the
  // client contract (for example, a proxy returning an HTML error page).
  const allProducts = Array.isArray(products) ? products : [];
  const categories = useMemo(() => ['Todas', ...Array.from(new Set(allProducts.map((product) => product.category))).sort()], [allProducts]);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allProducts.filter((product) => {
      const matchesCategory = category === 'Todas' || product.category === category;
      const matchesSearch = !term || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch && (!lowOnly || product.stock <= 5);
    });
  }, [allProducts, category, lowOnly, search]);
  const lowProducts = useMemo(() => allProducts.filter((product) => product.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 3), [allProducts]);
  const lowStockCount = useMemo(() => allProducts.filter((product) => product.stock <= 5).length, [allProducts]);
  const pending = createProduct.isPending || updateProduct.isPending || deleteProduct.isPending;
  const queryError = productsError || summaryError;
  const derivedSummary = summary ?? {
    totalProducts: allProducts.length,
    totalUnits: allProducts.reduce((total, product) => total + product.stock, 0),
    inventoryValue: allProducts.reduce((total, product) => total + product.costPrice * product.stock, 0),
    projectedProfit: allProducts.reduce((total, product) => total + (product.salePrice - product.costPrice) * product.stock, 0),
    lowStockCount,
    categories: categories.length - 1,
  };

  const invalidateCatalog = () => {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProductSummaryQueryKey() });
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const handleSubmit = (values: FormValues) => {
    if (values.costPrice === '' || values.salePrice === '' || values.stock === '') return;
    const payload: ProductInput = {
      ...values,
      costPrice: Number(values.costPrice),
      salePrice: Number(values.salePrice),
      stock: Number(values.stock),
    };
    if (editing) {
      updateProduct.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => {
          invalidateCatalog();
          setDialogOpen(false);
          setNotice('Producto actualizado');
        },
      });
    } else {
      createProduct.mutate({ data: payload }, {
        onSuccess: () => {
          invalidateCatalog();
          setDialogOpen(false);
          setNotice('Producto agregado al catálogo');
        },
      });
    }
  };

  const handleDelete = (product: Product) => {
    if (!window.confirm(`¿Eliminar “${product.name}” del catálogo?`)) return;
    deleteProduct.mutate({ id: product.id }, {
      onSuccess: () => {
        invalidateCatalog();
        setNotice('Producto eliminado');
      },
    });
  };

  const refresh = () => {
    void refetchProducts();
    void refetchSummary();
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[208px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-[64px] items-center border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Package2 size={16} strokeWidth={2.5} /></div>
            <div><p className="font-display text-[15px] font-bold leading-none">Catálogo</p><p className="mt-1 font-mono-data text-[9px] uppercase tracking-[.13em] text-sidebar-foreground/55">inventario</p></div>
          </div>
        </div>
        <div className="flex-1 px-3 py-5">
          <nav className="space-y-1">
            <button type="button" data-testid="nav-inventory" className="flex w-full items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2.5 text-left text-sm font-semibold text-sidebar-accent-foreground"><Package2 size={16} /> Inventario <span className="ml-auto rounded bg-sidebar-primary/15 px-1.5 py-0.5 font-mono-data text-[10px] text-sidebar-primary">{derivedSummary.totalProducts}</span></button>
            <button type="button" data-testid="nav-categories" onClick={() => { setCategory('Todas'); setLowOnly(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground/65 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Tags size={15} /> Categorías <span className="ml-auto font-mono-data text-[10px]">{derivedSummary.categories}</span></button>
          </nav>
          <div className="mt-5 border-t border-sidebar-border pt-4">
            <button type="button" onClick={() => { setSearch(''); setCategory('Todas'); setLowOnly(false); }} data-testid="button-clear-filters-sidebar" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><SlidersHorizontal size={14} /> Limpiar filtros</button>
            <button type="button" onClick={openNew} data-testid="button-sidebar-new-product" className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Plus size={14} /> Nuevo producto</button>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary font-mono-data text-[10px] font-bold text-sidebar-primary-foreground">CM</div>
            <div><p className="text-xs font-semibold">Casa Mercado</p><p className="mt-0.5 text-[10px] text-sidebar-foreground/45">Tienda</p></div>
          </div>
        </div>
      </aside>

      <div className="md:pl-[208px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="flex h-[60px] items-center justify-between px-4 sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setMobileMenu((open) => !open)} data-testid="button-toggle-mobile-menu" className="icon-button md:hidden" aria-label="Abrir menú"><Menu size={18} /></button>
              <h1 className="font-display text-[18px] font-semibold tracking-tight">Inventario</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button type="button" onClick={refresh} disabled={productsLoading || summaryLoading} data-testid="button-refresh-catalog" className="icon-button" title="Actualizar catálogo" aria-label="Actualizar catálogo"><RefreshCw size={15} className={productsLoading || summaryLoading ? 'animate-spin' : ''} /></button>
              <button type="button" onClick={openNew} data-testid="button-new-product-header" className="button-primary h-9 px-3 text-xs sm:px-4"><Plus size={15} /> <span className="hidden sm:inline">Nuevo producto</span><span className="sm:hidden">Nuevo</span></button>
            </div>
          </div>
          {mobileMenu && <div className="border-t border-border bg-card px-4 py-3 md:hidden"><div className="flex items-center gap-2 text-sm font-semibold text-primary"><Package2 size={15} /> Inventario <span className="font-mono-data ml-auto text-xs">{derivedSummary.totalProducts} productos</span></div><button type="button" onClick={() => { setSearch(''); setCategory('Todas'); setLowOnly(false); setMobileMenu(false); }} data-testid="button-mobile-clear-filters" className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline">Limpiar filtros</button></div>}
        </header>

        <main className="min-h-[calc(100dvh-60px)] px-4 py-6 sm:px-7 sm:py-7 lg:px-9">
          <div className="mx-auto max-w-[1420px]">
            <section className="animate-rise">
              <div><h2 className="font-display text-2xl font-semibold tracking-[-.035em] sm:text-3xl">Productos</h2><p className="mt-1 text-sm text-muted-foreground">Existencias, precios y margen por producto.</p></div>
            </section>

            {notice && <div className="mt-5 flex items-center justify-between rounded-lg border border-[hsl(var(--chart-3)/.5)] bg-[hsl(var(--chart-3)/.13)] px-4 py-3 text-sm text-primary animate-rise" data-testid="status-success"><span>{notice}</span><button type="button" onClick={() => setNotice('')} data-testid="button-dismiss-notice" aria-label="Cerrar aviso"><X size={15} /></button></div>}
            {queryError && <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm text-destructive" data-testid="status-error"><span>No pudimos cargar todo el catálogo. Revisa tu conexión e inténtalo otra vez.</span><button type="button" onClick={refresh} data-testid="button-retry-catalog" className="button-secondary h-8 shrink-0 border-[hsl(var(--destructive)/.25)] px-3 text-xs text-destructive">Reintentar</button></div>}
            {(createProduct.error || updateProduct.error || deleteProduct.error) && <div className="mt-5 rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm text-destructive" data-testid="status-mutation-error">{errorText(createProduct.error || updateProduct.error || deleteProduct.error)}</div>}

            <section className="mt-7 grid grid-cols-2 gap-x-4 border-y border-card-border bg-card px-3 py-3 sm:grid-cols-4 sm:px-0 sm:py-4">
              {summaryLoading ? [1, 2, 3, 4].map((item) => <div key={item} className="h-[112px] animate-pulse border-l border-card-border bg-card/70 first:border-l-0" data-testid={`skeleton-summary-${item}`} />) : <>
                <SummaryCard label="Productos" value={number.format(derivedSummary.totalProducts)} detail={`${derivedSummary.categories} categorías activas`} icon={<Boxes size={18} />} accent="green" />
                <SummaryCard label="Unidades" value={number.format(derivedSummary.totalUnits)} detail="piezas en existencia" icon={<Layers3 size={18} />} accent="lime" />
                <SummaryCard label="Valor en inventario" value={formatCurrency(derivedSummary.inventoryValue)} detail="a precio de costo" icon={<WalletCards size={18} />} accent="blue" />
                <SummaryCard label="Utilidad proyectada" value={formatCurrency(derivedSummary.projectedProfit)} detail="si se vende todo el stock" icon={<TrendingUp size={18} />} accent="coral" />
              </>}
            </section>

            {lowProducts.length > 0 && <section className="mt-5 border-y border-[hsl(var(--accent)/.32)] bg-[hsl(var(--accent)/.06)]" data-testid="section-low-stock">
              <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
                <div className="flex items-center gap-2 text-accent"><AlertTriangle size={16} /><span className="text-xs font-bold">Stock bajo</span><span className="font-mono-data text-[11px] font-bold">{derivedSummary.lowStockCount}</span></div>
                <div className="hidden h-4 w-px bg-accent/25 sm:block" />
                <div className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-xs text-foreground/75">
                  {lowProducts.map((product) => <span key={product.id} data-testid={`text-low-stock-${product.id}`}><strong>{product.name}</strong> <span className="font-mono-data text-accent">{product.stock} pzas.</span></span>)}
                </div>
                <button type="button" onClick={() => { setLowOnly(true); setSearch(''); setCategory('Todas'); }} data-testid="button-view-low-stock" className="text-left text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver productos</button>
              </div>
            </section>}

            {(lowOnly || search || category !== 'Todas') && <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span>Filtros:</span>{lowOnly && <button type="button" onClick={() => setLowOnly(false)} data-testid="button-remove-low-stock-filter" className="inline-flex items-center gap-1 border border-[hsl(var(--accent)/.28)] bg-[hsl(var(--accent)/.08)] px-2 py-1 font-semibold text-accent">Stock bajo <X size={11} /></button>}{search && <button type="button" onClick={() => setSearch('')} data-testid="button-remove-search-filter" className="inline-flex max-w-[180px] items-center gap-1 truncate border border-border bg-card px-2 py-1 font-semibold text-foreground">“{search}” <X size={11} /></button>}{category !== 'Todas' && <button type="button" onClick={() => setCategory('Todas')} data-testid="button-remove-category-filter" className="inline-flex items-center gap-1 border border-border bg-card px-2 py-1 font-semibold text-foreground">{category} <X size={11} /></button>}</div>}

            <section className="mt-6 overflow-hidden border border-card-border bg-card">
              <div className="border-b border-card-border px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div><h3 className="font-display text-lg font-bold tracking-tight">Todos los productos</h3><p className="mt-0.5 text-xs text-muted-foreground">{visibleProducts.length} de {allProducts.length} registros visibles</p></div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative block sm:w-[245px]"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-products" className="field h-9 pl-9 pr-3 text-xs" placeholder="Buscar por nombre o SKU" /></label>
                    <label className="relative block sm:w-[165px]"><Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><select value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-product-category" className="field h-9 appearance-none pl-9 pr-8 text-xs"><option value="Todas">Todas las categorías</option>{categories.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></label>
                  </div>
                </div>
              </div>
              {productsLoading ? <div className="space-y-0" data-testid="product-list-loading">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="flex h-[70px] animate-pulse items-center gap-4 border-b border-card-border px-5"><span className="h-9 w-9 rounded-lg bg-secondary" /><span className="h-3 w-44 rounded bg-secondary" /><span className="ml-auto h-3 w-20 rounded bg-secondary" /></div>)}</div> : visibleProducts.length === 0 ? <div className="flex min-h-[270px] flex-col items-center justify-center px-5 text-center" data-testid="empty-product-list"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Package2 size={22} /></div><h4 className="font-display text-lg font-bold">{allProducts.length === 0 ? 'Tu catálogo empieza aquí' : 'No hay coincidencias'}</h4><p className="mt-1 max-w-sm text-xs text-muted-foreground">{allProducts.length === 0 ? 'Agrega el primer producto para empezar a ver tus existencias.' : 'Prueba con otra búsqueda o limpia los filtros activos.'}</p><button type="button" onClick={allProducts.length === 0 ? openNew : () => { setSearch(''); setCategory('Todas'); setLowOnly(false); }} data-testid="button-empty-product-action" className="button-primary mt-5 h-9 px-4 text-xs">{allProducts.length === 0 ? 'Agregar producto' : 'Limpiar filtros'}</button></div> : <>
                <div className="hidden overflow-x-auto md:block"><div className="grid min-w-[790px] grid-cols-[minmax(190px,1.8fr)_110px_105px_105px_110px_82px_88px] gap-3 bg-secondary/45 px-4 py-2.5 font-mono-data text-[9px] uppercase tracking-[.13em] text-muted-foreground sm:px-5"><span>Producto</span><span>Categoría</span><span className="text-right">Costo</span><span className="text-right">Venta</span><span className="text-right">Stock</span><span className="text-right">Margen</span><span /></div>{visibleProducts.map((product) => <ProductRow key={product.id} product={product} onEdit={openEdit} onDelete={handleDelete} />)}</div>
                <div className="md:hidden">{visibleProducts.map((product) => <ProductMobileCard key={product.id} product={product} onEdit={openEdit} onDelete={handleDelete} />)}</div>
              </>}
              {visibleProducts.length > 0 && <div className="flex items-center justify-between border-t border-card-border bg-secondary/25 px-4 py-3 text-[10px] text-muted-foreground sm:px-5"><span>Margen unitario = precio de venta − costo</span><span className="font-mono-data">{visibleProducts.length} registros</span></div>}
            </section>
             <footer className="py-6 text-[10px] text-muted-foreground"><span>Catálogo de Inventario <span className="mx-1 text-border">/</span> Casa Mercado</span></footer>
          </div>
        </main>
      </div>
      <ProductDialog open={dialogOpen} editing={editing} pending={pending} onClose={() => setDialogOpen(false)} onSubmit={handleSubmit} />
    </div>
  );
}