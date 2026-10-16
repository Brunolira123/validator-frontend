import type { UsuarioAdmin, UsuarioAtualizacaoRequest, UsuarioCriacaoRequest } from '../types/api';
import api from './client';

// ADMIN/DIRETORIA. O backend também barra (403)
export const usuariosApi = {
  listar: async (): Promise<UsuarioAdmin[]> => {
    const { data } = await api.get<UsuarioAdmin[]>('/usuarios');
    return data;
  },

  criar: async (payload: UsuarioCriacaoRequest): Promise<UsuarioAdmin> => {
    const { data } = await api.post<UsuarioAdmin>('/usuarios', payload);
    return data;
  },

  atualizar: async (id: number, payload: UsuarioAtualizacaoRequest): Promise<UsuarioAdmin> => {
    const { data } = await api.put<UsuarioAdmin>(`/usuarios/${id}`, payload);
    return data;
  },

  // Definitivo. 409 para o próprio usuário ou para quem tem registros (aí, desative)
  excluir: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },
};
