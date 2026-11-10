import { isAxiosError } from 'axios';
import { mensagemErro } from './erro';
import api from './client';
import type {
  Atividade,
  AtividadeRequest,
  Calculo,
  CargaDia,
  Categoria,
  CategoriaRequest,
  Contato,
  ContatoRequest,
  Deslocamento,
  DeslocamentoRequest,
  EscopoFeriado,
  Feriado,
  FeriadoExtra,
  FeriadoRequest,
  FiltroPlanejamentos,
  PaginaPlanejamentos,
  Planejamento,
  PlanejamentoCriacaoRequest,
  PlanejamentoDadosRequest,
  SituacaoPlanejamento,
  Template,
  TemplateRequest,
  TemplateResumo,
} from '../types/projetos';

const p = (id: number) => `/projetos/planejamentos/${id}`;

// Cadastros: só PROJETOS, ADMIN e DIRETORIA (COMERCIAL recebe 403)
export const cadastrosApi = {
  categorias: async (ativas = false): Promise<Categoria[]> =>
    (await api.get<Categoria[]>('/projetos/categorias', { params: { ativas } })).data,
  criarCategoria: async (req: CategoriaRequest): Promise<Categoria> =>
    (await api.post<Categoria>('/projetos/categorias', req)).data,
  atualizarCategoria: async (id: number, req: CategoriaRequest): Promise<Categoria> =>
    (await api.put<Categoria>(`/projetos/categorias/${id}`, req)).data,
  /** Inativa. */
  inativarCategoria: async (id: number): Promise<void> => {
    await api.delete(`/projetos/categorias/${id}`);
  },

  feriados: async (params: { ano?: number; escopo?: EscopoFeriado } = {}): Promise<Feriado[]> =>
    (await api.get<Feriado[]>('/projetos/feriados', { params })).data,
  criarFeriado: async (req: FeriadoRequest): Promise<Feriado> =>
    (await api.post<Feriado>('/projetos/feriados', req)).data,
  atualizarFeriado: async (id: number, req: FeriadoRequest): Promise<Feriado> =>
    (await api.put<Feriado>(`/projetos/feriados/${id}`, req)).data,
  /** Apaga de fato. */
  excluirFeriado: async (id: number): Promise<void> => {
    await api.delete(`/projetos/feriados/${id}`);
  },

  templates: async (ativos = false): Promise<TemplateResumo[]> =>
    (await api.get<TemplateResumo[]>('/projetos/templates', { params: { ativos } })).data,
  template: async (id: number): Promise<Template> => (await api.get<Template>(`/projetos/templates/${id}`)).data,
  criarTemplate: async (req: TemplateRequest): Promise<Template> =>
    (await api.post<Template>('/projetos/templates', req)).data,
  /** Substitui as atividades e sobe a versão. */
  atualizarTemplate: async (id: number, req: TemplateRequest): Promise<Template> =>
    (await api.put<Template>(`/projetos/templates/${id}`, req)).data,
  inativarTemplate: async (id: number): Promise<void> => {
    await api.delete(`/projetos/templates/${id}`);
  },

  contatos: async (clienteId: number, ativos = false): Promise<Contato[]> =>
    (await api.get<Contato[]>(`/projetos/clientes/${clienteId}/contatos`, { params: { ativos } })).data,
  criarContato: async (clienteId: number, req: ContatoRequest): Promise<Contato> =>
    (await api.post<Contato>(`/projetos/clientes/${clienteId}/contatos`, req)).data,
  atualizarContato: async (id: number, req: ContatoRequest): Promise<Contato> =>
    (await api.put<Contato>(`/projetos/contatos/${id}`, req)).data,
  inativarContato: async (id: number): Promise<void> => {
    await api.delete(`/projetos/contatos/${id}`);
  },
};

// Planejamentos: leitura também para COMERCIAL (só os dele); escrita, cálculo e carga só para os editores
export const planejamentosApi = {
  listar: async ({ pagina = 0, tamanho = 20, ...filtro }: FiltroPlanejamentos = {}): Promise<PaginaPlanejamentos> =>
    (await api.get<PaginaPlanejamentos>('/projetos/planejamentos', { params: { ...filtro, pagina, tamanho } })).data,
  buscar: async (id: number): Promise<Planejamento> => (await api.get<Planejamento>(p(id))).data,
  criar: async (req: PlanejamentoCriacaoRequest): Promise<Planejamento> =>
    (await api.post<Planejamento>('/projetos/planejamentos', req)).data,
  atualizar: async (id: number, req: PlanejamentoDadosRequest): Promise<Planejamento> =>
    (await api.put<Planejamento>(p(id), req)).data,
  mudarSituacao: async (id: number, situacao: SituacaoPlanejamento): Promise<Planejamento> =>
    (await api.put<Planejamento>(`${p(id)}/situacao`, { situacao })).data,
  aplicarTemplate: async (id: number, templateId: number, substituir = false): Promise<Planejamento> =>
    (await api.post<Planejamento>(`${p(id)}/aplicar-template`, { templateId, substituir })).data,
  /** `nome` cria um template novo; `templateId` grava nova versão dele. */
  salvarComoTemplate: async (id: number, req: { nome: string } | { templateId: number }): Promise<Template> =>
    (await api.post<Template>(`${p(id)}/salvar-como-template`, req)).data,
  calcular: async (id: number): Promise<Calculo> => (await api.post<Calculo>(`${p(id)}/calcular`)).data,

  criarAtividade: async (id: number, req: AtividadeRequest): Promise<Atividade> =>
    (await api.post<Atividade>(`${p(id)}/atividades`, req)).data,
  atualizarAtividade: async (id: number, atividadeId: number, req: AtividadeRequest): Promise<Atividade> =>
    (await api.put<Atividade>(`${p(id)}/atividades/${atividadeId}`, req)).data,
  /** Apaga também as subtarefas e as dependências que apontavam para elas. */
  excluirAtividade: async (id: number, atividadeId: number): Promise<void> => {
    await api.delete(`${p(id)}/atividades/${atividadeId}`);
  },
  /** Lista vazia = tudo para o responsável. */
  distribuir: async (id: number, atividadeId: number, divisao: { usuarioId: number; horas: number }[]) =>
    (await api.put<Atividade>(`${p(id)}/atividades/${atividadeId}/distribuicao`, divisao)).data,
  dependencias: async (id: number, atividadeId: number, dependeDe: number[]) =>
    (await api.put<Atividade>(`${p(id)}/atividades/${atividadeId}/dependencias`, { dependeDe })).data,

  criarDeslocamento: async (id: number, req: DeslocamentoRequest): Promise<Deslocamento> =>
    (await api.post<Deslocamento>(`${p(id)}/deslocamentos`, req)).data,
  atualizarDeslocamento: async (id: number, deslocamentoId: number, req: DeslocamentoRequest) =>
    (await api.put<Deslocamento>(`${p(id)}/deslocamentos/${deslocamentoId}`, req)).data,
  excluirDeslocamento: async (id: number, deslocamentoId: number): Promise<void> => {
    await api.delete(`${p(id)}/deslocamentos/${deslocamentoId}`);
  },

  criarFeriadoExtra: async (id: number, req: { data: string; descricao?: string | null }): Promise<FeriadoExtra> =>
    (await api.post<FeriadoExtra>(`${p(id)}/feriados-extras`, req)).data,
  excluirFeriadoExtra: async (id: number, feriadoId: number): Promise<void> => {
    await api.delete(`${p(id)}/feriados-extras/${feriadoId}`);
  },

  /**
   * PDF do cronograma para o cliente. Exige cálculo em dia (senão 409). `marcarEnviado` passa a situação para
   * ENVIADO (só os editores, a partir de EM_PLANEJAMENTO).
   */
  cronogramaPdf: async (id: number, marcarEnviado = false): Promise<Blob> =>
    (await api.get<Blob>(`${p(id)}/cronograma.pdf`, { params: { marcarEnviado }, responseType: 'blob' })).data,

  /** Período de até 366 dias. */
  carga: async (de: string, ate: string): Promise<CargaDia[]> =>
    (await api.get<CargaDia[]>('/projetos/carga', { params: { de, ate } })).data,
};

/** O 400 do cálculo traz todos os problemas em `erros`; os outros erros não. */
export function errosDoCalculo(e: unknown): string[] | null {
  if (!isAxiosError<{ erros?: string[] }>(e) || e.response?.status !== 400) return null;
  const erros = e.response.data?.erros;
  return Array.isArray(erros) && erros.length > 0 ? erros : null;
}

/** Com `responseType: 'blob'` o corpo do erro também chega como Blob: lê o JSON para achar a `mensagem`. */
export async function mensagemErroBlob(e: unknown, fallback: string): Promise<string> {
  if (isAxiosError(e) && e.response?.data instanceof Blob) {
    try {
      const corpo = JSON.parse(await e.response.data.text()) as { mensagem?: string };
      if (corpo.mensagem) return corpo.mensagem;
    } catch {
      // não era JSON: cai na mensagem por status
    }
    e.response.data = undefined;
  }
  return mensagemErro(e, fallback);
}
