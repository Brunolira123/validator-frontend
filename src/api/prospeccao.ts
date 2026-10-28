import type {
  CategoriaProspeccao,
  LtoProspectRequest,
  LtoProspectResponse,
  PaginaBuscaProspect,
  PaginaProspects,
  ProspectResponse,
  SalvarProspectRequest,
  StatusProspect,
  TemperaturaNegociacao,
  VisitaProspectRequest,
} from '../types/api';
import api from './client';

export interface FiltroBusca {
  cidade: string;
  uf: string;
  categorias: CategoriaProspeccao[];
}

export interface FiltroProspects {
  cidade?: string;
  uf?: string;
  status?: StatusProspect;
  temperatura?: TemperaturaNegociacao;
  pagina?: number;
  tamanho?: number;
}

export const prospeccaoApi = {
  /** Uma consulta ao Google por categoria; "carregar mais" = mesmo filtro + pagina = proximaPagina. */
  buscar: async (filtro: FiltroBusca, pagina?: string | null): Promise<PaginaBuscaProspect> => {
    const { data } = await api.get<PaginaBuscaProspect>('/prospeccao/busca', {
      params: {
        cidade: filtro.cidade,
        uf: filtro.uf,
        categorias: filtro.categorias.join(',') || undefined,
        pagina: pagina || undefined,
      },
    });
    return data;
  },

  /** fotoUrl vem relativa à base da API e precisa do Bearer, por isso vai como blob. */
  foto: async (fotoUrl: string, signal?: AbortSignal): Promise<Blob> => {
    const { data } = await api.get<Blob>(fotoUrl, { responseType: 'blob', signal });
    return data;
  },

  /** criado = 201; false = 200 (o lugar já era prospect seu). */
  salvar: async (payload: SalvarProspectRequest): Promise<{ prospect: ProspectResponse; criado: boolean }> => {
    const resposta = await api.post<ProspectResponse>('/prospeccao/prospects', payload);
    return { prospect: resposta.data, criado: resposta.status === 201 };
  },

  listar: async (filtro: FiltroProspects): Promise<PaginaProspects> => {
    const { data } = await api.get<PaginaProspects>('/prospeccao/prospects', { params: filtro });
    return data;
  },

  buscarProspect: async (id: number): Promise<ProspectResponse> => {
    const { data } = await api.get<ProspectResponse>(`/prospeccao/prospects/${id}`);
    return data;
  },

  registrarVisita: async (id: number, payload: VisitaProspectRequest): Promise<ProspectResponse> => {
    const { data } = await api.post<ProspectResponse>(`/prospeccao/prospects/${id}/visita`, payload);
    return data;
  },

  descartar: async (id: number): Promise<ProspectResponse> => {
    const { data } = await api.post<ProspectResponse>(`/prospeccao/prospects/${id}/descartar`);
    return data;
  },

  lto: async (id: number, payload: LtoProspectRequest): Promise<LtoProspectResponse> => {
    const { data } = await api.post<LtoProspectResponse>(`/prospeccao/prospects/${id}/lto`, payload);
    return data;
  },
};
