import type {
  ClienteMonitoradoDetalhe,
  ClienteMonitoradoRequest,
  ClienteMonitoradoResponse,
  ExecucaoMonitor,
  PedidoConsulta,
  TokenAgenteResponse,
} from '../types/api';
import api from './client';

export const monitorApi = {
  listar: async (): Promise<ClienteMonitoradoResponse[]> => {
    const { data } = await api.get<ClienteMonitoradoResponse[]>('/monitor/clientes');
    return data;
  },

  detalhar: async (id: number): Promise<ClienteMonitoradoDetalhe> => {
    const { data } = await api.get<ClienteMonitoradoDetalhe>(`/monitor/clientes/${id}`);
    return data;
  },

  historico: async (id: number, dias = 30): Promise<ExecucaoMonitor[]> => {
    const { data } = await api.get<ExecucaoMonitor[]>(`/monitor/clientes/${id}/historico`, { params: { dias } });
    return data;
  },

  // ADMIN/DIRETORIA. O token volta só aqui: o backend guarda o hash
  criar: async (payload: ClienteMonitoradoRequest): Promise<TokenAgenteResponse> => {
    const { data } = await api.post<TokenAgenteResponse>('/monitor/clientes', payload);
    return data;
  },

  // Invalida o token anterior na hora
  gerarNovoToken: async (id: number): Promise<TokenAgenteResponse> => {
    const { data } = await api.post<TokenAgenteResponse>(`/monitor/clientes/${id}/token`);
    return data;
  },

  // "Consultar agora": o agente busca o pedido em até ~30s
  consultar: async (id: number): Promise<PedidoConsulta> => {
    const { data } = await api.post<PedidoConsulta>(`/monitor/clientes/${id}/consultar`);
    return data;
  },

  pedido: async (id: number): Promise<PedidoConsulta> => {
    const { data } = await api.get<PedidoConsulta>(`/monitor/pedidos/${id}`);
    return data;
  },
};
