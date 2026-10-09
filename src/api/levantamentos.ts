import api from './client';
import type {
  LevantamentoRequest,
  LevantamentoResponse,
  EquipamentoResponse,
  RelatorioLevantamentoDTO,
} from '../types/api';

export const levantamentosApi = {
  criar: async (payload: LevantamentoRequest): Promise<LevantamentoResponse> => {
    const { data } = await api.post<LevantamentoResponse>('/levantamentos', payload);
    return data;
  },

  buscar: async (id: number): Promise<LevantamentoResponse> => {
    const { data } = await api.get<LevantamentoResponse>(`/levantamentos/${id}`);
    return data;
  },

  gerarEquipamentos: async (id: number): Promise<LevantamentoResponse> => {
    const { data } = await api.post<LevantamentoResponse>(`/levantamentos/${id}/gerar-equipamentos`);
    return data;
  },

  listarEquipamentos: async (id: number): Promise<EquipamentoResponse[]> => {
    const { data } = await api.get<EquipamentoResponse[]>(`/levantamentos/${id}/equipamentos`);
    return data;
  },

  relatorio: async (id: number): Promise<RelatorioLevantamentoDTO> => {
    const { data } = await api.get<RelatorioLevantamentoDTO>(`/levantamentos/${id}/relatorio`);
    return data;
  },

  concluir: async (id: number): Promise<LevantamentoResponse> => {
    const { data } = await api.post<LevantamentoResponse>(`/levantamentos/${id}/concluir`);
    return data;
  },

  cancelar: async (id: number): Promise<LevantamentoResponse> => {
    const { data } = await api.post<LevantamentoResponse>(`/levantamentos/${id}/cancelar`);
    return data;
  },

  reabrir: async (id: number): Promise<LevantamentoResponse> => {
    const { data } = await api.post<LevantamentoResponse>(`/levantamentos/${id}/reabrir`);
    return data;
  },

  listarPorCliente: async (clienteId: number): Promise<LevantamentoResponse[]> => {
  const { data } = await api.get<LevantamentoResponse[]>(`/levantamentos`, {
    params: { clienteId },
  });
  return data;
},
};