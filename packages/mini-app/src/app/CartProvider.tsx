import type { Cart, CartItem } from "@flowers-tg/shared";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { apiClient } from "@/api/client";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  addItem: (productId: string, quantity?: number) => Promise<{ error?: string }>;
  updateQuantity: (productId: string, quantity: number) => Promise<{ error?: string }>;
  removeItem: (productId: string) => Promise<{ error?: string }>;
  clearCart: () => Promise<void>;
  applyPromo: (code: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  cart: null,
  loading: true,
  error: null,
  itemCount: 0,
  addItem: async () => ({}),
  updateQuantity: async () => ({}),
  removeItem: async () => ({}),
  clearCart: async () => {},
  applyPromo: async () => ({}),
  refresh: async () => {},
});

export function useCart() {
  return useContext(CartContext);
}

function emptyCart(): Cart {
  return {
    id: "",
    userId: "",
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemCount =
    cart?.items.reduce<number>((sum: number, item: CartItem) => sum + item.quantity, 0) ?? 0;

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient<{ data: Cart }>("/cart");
      setCart(res.data);
      setError(null);
    } catch (err) {
      setCart(emptyCart());
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1): Promise<{ error?: string }> => {
      try {
        const res = await apiClient<{ data: Cart }>("/cart/items", {
          method: "POST",
          body: JSON.stringify({ productId, quantity }),
        });
        setCart(res.data);
        setError(null);
        return {};
      } catch (err) {
        return { error: errMsg(err) };
      }
    },
    [],
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number): Promise<{ error?: string }> => {
      try {
        const res = await apiClient<{ data: Cart }>(`/cart/items/${productId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        });
        setCart(res.data);
        setError(null);
        return {};
      } catch (err) {
        return { error: errMsg(err) };
      }
    },
    [],
  );

  const removeItem = useCallback(async (productId: string): Promise<{ error?: string }> => {
    try {
      const res = await apiClient<{ data: Cart }>(`/cart/items/${productId}`, {
        method: "DELETE",
      });
      setCart(res.data);
      setError(null);
      return {};
    } catch (err) {
      return { error: errMsg(err) };
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      const res = await apiClient<{ data: Cart }>("/cart", { method: "DELETE" });
      setCart(res.data);
      setError(null);
    } catch {
      setCart(emptyCart());
    }
  }, []);

  const applyPromo = useCallback(async (code: string): Promise<{ error?: string }> => {
    try {
      const res = await apiClient<{ data: Cart }>("/cart/promo", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setCart(res.data);
      setError(null);
      return {};
    } catch (err) {
      return { error: errMsg(err) };
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyPromo,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
