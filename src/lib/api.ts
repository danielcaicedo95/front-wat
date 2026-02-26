// frontend/src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Tipos que coinciden con tu estructura de datos de `InventoryList`
export interface Variant {
  id: string;
  options: Record<string, string>;
  price: number;
  stock: number;
}

export interface ImageRecord {
  id: string;
  url: string;
  variant_id: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  product_variants: Variant[];
  product_images: ImageRecord[];
  category?: Category;
}


/**
 * Obtiene todos los productos desde el backend.
 */
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products/`);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
}

/**
 * Crea un nuevo producto.
 */
export async function createProduct(formData: FormData): Promise<Product> {
  const response = await fetch(`${API_URL}/products/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to create product');
  }
  return response.json();
}

/**
 * Elimina un producto por su ID.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const response = await fetch(`${API_URL}/products/${productId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete product');
  }
}

/**
 * NUEVO: Elimina una variante por su ID.
 */
export async function deleteVariant(variantId: string): Promise<void> {
  // Nota el cambio en la URL para que coincida con el nuevo endpoint del backend
  const response = await fetch(`${API_URL}/products/variants/${variantId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete variant');
  }
}

export async function updateProductStock(productId: string, newStock: number): Promise<void> {
  const response = await fetch(`${API_URL}/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock }),
  });
  if (!response.ok) throw new Error('Failed to update product stock');
}

/**
 * Actualiza cualquier campo de un producto existente.
 */
export async function updateProduct(productId: string, data: {
  name?: string; description?: string; price?: number; stock?: number; category_id?: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update product');
  }
}

/**
 * Actualiza opciones, precio o stock de una variante.
 */
export async function updateVariantStock(variantId: string, newStock: number): Promise<void> {
  const response = await fetch(`${API_URL}/products/variants/${variantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock }),
  });
  if (!response.ok) throw new Error('Failed to update variant stock');
}

export async function updateVariant(variantId: string, data: {
  options?: Record<string, string>; price?: number; stock?: number;
}): Promise<void> {
  const response = await fetch(`${API_URL}/products/variants/${variantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update variant');
  }
}

/**
 * Sube una imagen adicional a un producto ya existente.
 */
export async function addProductImage(productId: string, file: File, variantId?: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);
  if (variantId) formData.append('variant_id', variantId);
  const response = await fetch(`${API_URL}/products/${productId}/images`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload image');
  return response.json();
}

/**
 * Elimina una imagen específica de un producto.
 */
export async function deleteProductImage(imageId: string): Promise<void> {
  const response = await fetch(`${API_URL}/products/images/${imageId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete image');
}

/**
 * Crea una variante nueva en un producto ya existente (con imagen opcional).
 */
export async function addVariantToProduct(productId: string, data: {
  option_key: string; option_value: string; price?: number; stock?: number; image?: File;
}): Promise<{ id: string; options: Record<string, string>; price: number; stock: number; image_url: string | null }> {
  const formData = new FormData();
  formData.append('option_key', data.option_key);
  formData.append('option_value', data.option_value);
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.stock !== undefined) formData.append('stock', String(data.stock));
  if (data.image) formData.append('image', data.image);
  const response = await fetch(`${API_URL}/products/${productId}/variants`, { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add variant');
  }
  return response.json();
}

/**
 * Sube o reemplaza la imagen de una variante.
 */
export async function setVariantImage(variantId: string, productId: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('product_id', productId);
  formData.append('image', file);
  const response = await fetch(`${API_URL}/products/variants/${variantId}/image`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Failed to set variant image');
  return response.json();
}


// ==========================================
// CATEGORY ENDPOINTS
// ==========================================

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create category');
  }
  return response.json();
}

export async function updateCategory(categoryId: string, data: {
  name?: string; description?: string; parent_id?: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/categories/${categoryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update category');
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete category');
  }
}