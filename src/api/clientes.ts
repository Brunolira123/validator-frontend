import type { ClienteRequest, ClienteResponse, CnpjResponseDTO } from '../types/api';
import api from './client';


export const clientesApi = {
  listar: async (): Promise<ClienteResponse[]> => {
    const { data } = await api.get<ClienteResponse[]>('/clientes');
    return data;
  },

  buscar: async (id: number): Promise<ClienteResponse> => {
    const { data } = await api.get<ClienteResponse>(`/clientes/${id}`);
    return data;
  },

  criar: async (payload: ClienteRequest): Promise<ClienteResponse> => {
    const { data } = await api.post<ClienteResponse>('/clientes', payload);
    return data;
  },

  consultarCnpj: async (cnpj: string): Promise<CnpjResponseDTO> => {
    const limpo = cnpj.replace(/\D/g, '');
    const { data } = await api.get<CnpjResponseDTO>(`/clientes/consulta-cnpj/${limpo}`);
    return data;
  },
};