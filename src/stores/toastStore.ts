import { create } from 'zustand';

export type TipoToast = 'sucesso' | 'erro';

interface Toast {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

interface ToastState {
  toasts: Toast[];
  mostrar: (mensagem: string, tipo?: TipoToast) => void;
  fechar: (id: number) => void;
}

let proximoId = 1;

/** Avisos curtos que somem sozinhos (4s). Quem renderiza é o <Toaster /> do Layout. */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  mostrar: (mensagem, tipo = 'sucesso') => {
    const id = proximoId++;
    set({ toasts: [...get().toasts, { id, mensagem, tipo }] });
    setTimeout(() => get().fechar(id), 4_000);
  },
  fechar: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (mensagem: string, tipo?: TipoToast) => useToastStore.getState().mostrar(mensagem, tipo);
