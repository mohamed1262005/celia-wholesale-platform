import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CartItem, Product } from '@/types';
import { getPricingForQuantity } from '@/lib/pricing';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('celia-cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const saveCart = useCallback((newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('celia-cart', JSON.stringify(newItems));
    } catch (e) {}
  }, []);

  const addToCart = useCallback((product: Product, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const price = getPricingForQuantity(product, quantity);
      let updated: CartItem[];

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newPrice = getPricingForQuantity(product, newQty);
        updated = prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: newQty, applicablePrice: newPrice }
            : i
        );
      } else {
        const newItem: CartItem = { product, quantity, applicablePrice: price };
        updated = [...prev, newItem];
      }

      try {
        localStorage.setItem('celia-cart', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) return;
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.product.id === productId) {
          const price = getPricingForQuantity(item.product, quantity);
          return { ...item, quantity, applicablePrice: price };
        }
        return item;
      });
      try {
        localStorage.setItem('celia-cart', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.product.id !== productId);
      try {
        localStorage.setItem('celia-cart', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
  }, [saveCart]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.applicablePrice ?? i.product.price ?? 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [],
      addToCart: () => {},
      updateQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      totalItems: 0,
      subtotal: 0,
    };
  }
  return ctx;
}