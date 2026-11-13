import type {
  ClienteListaResponse,
  ClienteMonitoradoDetalhe,
  FiltroClientes,
  ClienteMonitoradoRequest,
  ExecucaoMonitor,
  PedidoConsulta,
  PedidoLog,
  PedidoLogCriado,
  PedidoAcao,
  TipoAcaoContainer,
  VersaoAlvoLoteRequest,
  SuporteClienteResponse,
  TokenAgenteResponse,
  VersaoBancoContagem,
} from '../types/api';
import api from './client';

export const monitorApi = {
  // Lista única (Monitoramento + Suporte). Sem filtro: só os ativos
  listar: async (filtro: FiltroClientes = {}): Promise<ClienteListaResponse[]> => {
    const params = Object.fromEntries(
      Object.entries(filtro).filter(([, v]) => v !== undefined && v !== false && v !== '' && !(Array.isArray(v) && !v.length)),
    );
    const { data } = await api.get<ClienteListaResponse[]>('/monitor/clientes', {
      params,
      // situacao=OK&situacao=FALHA (o Spring não entende situacao[]=)
      paramsSerializer: { indexes: null },
    });
    return data;
  },

  versoesBanco: async (): Promise<VersaoBancoContagem[]> => {
    const { data } = await api.get<VersaoBancoContagem[]>('/monitor/versoes-banco');
    return data;
  },

  // ADMIN/DIRETORIA. Revoga o token, expira os pedidos abertos e cancela a versão alvo; o histórico fica
  desativar: async (id: number, motivo: string | null): Promise<void> => {
    await api.post(`/monitor/clientes/${id}/desativar`, { motivo });
  },

  // ADMIN/DIRETORIA. Token novo, que só aparece aqui
  reativar: async (id: number): Promise<TokenAgenteResponse> => {
    const { data } = await api.post<TokenAgenteResponse>(`/monitor/clientes/${id}/reativar`);
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

  // Tela Clientes do Suporte: situação do agente, versão do BD e containers do servidor
  suporteClientes: async (): Promise<SuporteClienteResponse[]> => {
    const { data } = await api.get<SuporteClienteResponse[]>('/monitor/suporte/clientes');
    return data;
  },

  // Log de um container: o agente (2.3.0+) busca o pedido em até ~30s, igual ao "Consultar agora".
  // 400 linhas fora de 1..500; 404 container fora da última foto; 409 offline ou agente < 2.3.0
  pedirLog: async (clienteId: number, container: string, linhas: number): Promise<PedidoLogCriado> => {
    const { data } = await api.post<PedidoLogCriado>(
      `/monitor/suporte/clientes/${clienteId}/containers/${encodeURIComponent(container)}/log`,
      null,
      { params: { linhas } },
    );
    return data;
  },

  pedidoLog: async (clienteId: number, container: string, pedidoId: number): Promise<PedidoLog> => {
    const { data } = await api.get<PedidoLog>(
      `/monitor/suporte/clientes/${clienteId}/containers/${encodeURIComponent(container)}/log/${pedidoId}`,
    );
    return data;
  },

  // START/RESTART: agente 2.4.0+. 404 container fora da foto; 409 offline, agente antigo,
  // START com o container rodando ou RESTART com ele parado. Clique repetido devolve o pedido aberto
  pedirAcao: async (clienteId: number, container: string, tipo: TipoAcaoContainer): Promise<PedidoLogCriado> => {
    const { data } = await api.post<PedidoLogCriado>(
      `/monitor/suporte/clientes/${clienteId}/containers/${encodeURIComponent(container)}/acao`,
      null,
      { params: { tipo } },
    );
    return data;
  },

  pedidoAcao: async (clienteId: number, container: string, pedidoId: number): Promise<PedidoAcao> => {
    const { data } = await api.get<PedidoAcao>(
      `/monitor/suporte/clientes/${clienteId}/containers/${encodeURIComponent(container)}/acao/${pedidoId}`,
    );
    return data;
  },

  // ADMIN/DIRETORIA. null cancela a atualização pendente
  definirVersaoAlvo: async (clienteId: number, versao: string | null): Promise<void> => {
    await api.put(`/monitor/suporte/clientes/${clienteId}/agente/versao-alvo`, { versao });
  },

  // ADMIN/DIRETORIA. Quem já roda a versão fica de fora; responde quantos foram marcados
  definirVersaoAlvoEmLote: async (payload: VersaoAlvoLoteRequest): Promise<number> => {
    const { data } = await api.post<{ marcados: number }>('/monitor/suporte/agente/versao-alvo', payload);
    return data.marcados;
  },

  definirPiloto: async (clienteId: number, piloto: boolean): Promise<void> => {
    await api.put(`/monitor/suporte/clientes/${clienteId}/piloto`, { piloto });
  },
};
