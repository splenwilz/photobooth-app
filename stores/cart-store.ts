/**
 * Cart Store
 *
 * Global state management for template shopping cart using Zustand.
 * Persists cart items to SecureStore for app restarts.
 * Templates are digital products — each can only be added once (quantity 1).
 *
 * @see https://docs.pmnd.rs/zustand/getting-started/introduction
 * @see /api/templates/types.ts - CartItem, Template types
 */

import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { CartItem, Template } from "@/api/templates/types";

const STORAGE_KEY = "template_cart";

interface CartState {
  /** Items currently in the cart */
  items: CartItem[];
  /** Whether the store has been hydrated from storage */
  isHydrated: boolean;
  /** Add a template to the cart (no duplicates) */
  addItem: (template: Template) => void;
  /** Remove a template from the cart by ID */
  removeItem: (templateId: number) => void;
  /** Clear all items from the cart */
  clearCart: () => void;
  /** Get the cart subtotal */
  getSubtotal: () => number;
  /** Get the total number of items */
  getItemCount: () => number;
  /** Check if a template is already in the cart */
  isInCart: (templateId: number) => boolean;
  /** Hydrate state from SecureStore on app start */
  hydrate: () => Promise<void>;
}

/** Persist cart items to SecureStore */
async function persistCart(items: CartItem[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("[CartStore] Failed to persist cart:", error);
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isHydrated: false,

  addItem: (template: Template) => {
    const { items } = get();
    // Digital products — no duplicates
    if (items.some((item) => item.template.id === template.id)) {
      return;
    }
    const newItems = [...items, { template, quantity: 1 }];
    set({ items: newItems });
    persistCart(newItems);
  },

  removeItem: (templateId: number) => {
    const newItems = get().items.filter(
      (item) => item.template.id !== templateId,
    );
    set({ items: newItems });
    persistCart(newItems);
  },

  clearCart: () => {
    set({ items: [] });
    persistCart([]);
  },

  getSubtotal: () => {
    return get().items.reduce(
      (total, item) => total + parseFloat(item.template.price) * item.quantity,
      0,
    );
  },

  getItemCount: () => {
    return get().items.length;
  },

  isInCart: (templateId: number) => {
    return get().items.some((item) => item.template?.id === templateId);
  },

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        // Filter out any corrupt entries missing template data
        const items = parsed.filter(
          (item) => item.template && typeof item.template.id === "number",
        );
        set({ items, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.warn("[CartStore] Failed to hydrate:", error);
      set({ items: [], isHydrated: true });
    }
  },
}));
