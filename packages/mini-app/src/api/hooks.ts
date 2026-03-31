import type { Category, Product } from "@flowers-tg/shared";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "./client";
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from "./mock-data";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient<{ data: Category[] }>("/categories")
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {
        if (!cancelled) setCategories(MOCK_CATEGORIES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}

export function useProducts(categoryId?: string, search?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const rid = ++requestIdRef.current;
    setLoading(true);
    const qs = new URLSearchParams();
    if (categoryId) qs.set("categoryId", categoryId);
    if (search) qs.set("search", search);

    apiClient<{ data: { items: Product[]; total: number } }>(`/products?${qs}`)
      .then((res) => {
        if (rid !== requestIdRef.current) return;
        setProducts(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => {
        if (rid !== requestIdRef.current) return;
        let filtered = [...MOCK_PRODUCTS];
        if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter((p) => p.title.toLowerCase().includes(q));
        }
        setProducts(filtered);
        setTotal(filtered.length);
      })
      .finally(() => {
        if (rid === requestIdRef.current) setLoading(false);
      });
  }, [categoryId, search]);

  return { products, total, loading };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Товар не найден");
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiClient<{ data: Product }>(`/products/${id}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        const mock = MOCK_PRODUCTS.find((p) => p.id === id);
        if (mock) setProduct(mock);
        else setError("Товар не найден");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { product, loading, error };
}
