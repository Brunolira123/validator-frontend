import api from './client';
import type { AnaliseResponse, FotoResponse, ResultadoAnaliseDTO, RevisaoAnaliseRequest } from '../types/api';

export const equipamentosApi = {
  uploadFoto: async (equipamentoId: number, file: File): Promise<FotoResponse> => {
    const formData = new FormData();
    formData.append('foto', file);
    const { data } = await api.post<FotoResponse>(
      `/equipamentos/${equipamentoId}/fotos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  listarFotos: async (equipamentoId: number): Promise<FotoResponse[]> => {
    const { data } = await api.get<FotoResponse[]>(`/equipamentos/${equipamentoId}/fotos`);
    return data;
  },

  carregarFotoBlob: async (equipamentoId: number, fotoId: number): Promise<string> => {
    const response = await api.get(
      `/equipamentos/${equipamentoId}/fotos/${fotoId}/conteudo`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
  },

  // 204 (equipamento ainda não analisado) vira null
  buscarAnalise: async (equipamentoId: number): Promise<AnaliseResponse | null> => {
    const response = await api.get<AnaliseResponse>(`/equipamentos/${equipamentoId}/analise`);
    return response.status === 204 ? null : response.data;
  },

  analisar: async (equipamentoId: number): Promise<ResultadoAnaliseDTO> => {
    const { data } = await api.post<ResultadoAnaliseDTO>(
      `/equipamentos/${equipamentoId}/analisar`
    );
    return data;
  },

  revisar: async (
    equipamentoId: number,
    payload: RevisaoAnaliseRequest
  ): Promise<ResultadoAnaliseDTO> => {
    const { data } = await api.put<ResultadoAnaliseDTO>(
      `/equipamentos/${equipamentoId}/analise/revisar`,
      payload
    );
    return data;
  },
};