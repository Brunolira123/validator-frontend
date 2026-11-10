// ===== Projetos (planejamento de implantação, fase A1) =====
// Contrato: validator-infra/Claude outputs/contrato-projetos.md. Horas e valores em número; datas "aaaa-mm-dd".

export type SituacaoPlanejamento = 'RASCUNHO' | 'EM_PLANEJAMENTO' | 'ENVIADO' | 'CRIADO_ARTIA' | 'CANCELADO';
export type EscopoFeriado = 'NACIONAL' | 'LOCAL';
export type TipoAlocacao = 'SERVICO' | 'VIAGEM';

export interface Categoria {
  id: number;
  nome: string;
  horasPadrao: number;
  ativo: boolean;
}

export interface CategoriaRequest {
  nome: string;
  horasPadrao: number;
  ativo?: boolean;
}

export interface Feriado {
  id: number;
  data: string;
  descricao: string;
  escopo: EscopoFeriado;
  cidade: string | null;
  uf: string | null;
}

export interface FeriadoRequest {
  data: string;
  descricao: string;
  escopo: EscopoFeriado;
  cidade?: string | null;
  uf?: string | null;
}

export interface TemplateAtividade {
  chave: string;
  chavePai: string | null;
  nome: string;
  categoriaId: number | null;
  horas: number | null;
  dependeDe: string[];
  indivisivel: boolean;
  doCliente: boolean;
  diasCliente: number;
  ordem: number | null;
}

export interface TemplateResumo {
  id: number;
  nome: string;
  versao: number;
  ativo: boolean;
  qtdAtividades: number;
  atualizadoEm: string;
}

export interface Template extends Omit<TemplateResumo, 'qtdAtividades'> {
  atividades: TemplateAtividade[];
}

export interface TemplateRequest {
  nome: string;
  ativo?: boolean;
  atividades: TemplateAtividade[];
}

export interface Contato {
  id: number;
  clienteId: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  setor: string | null;
  ativo: boolean;
}

export interface ContatoRequest {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  setor?: string | null;
  ativo?: boolean;
}

export interface Divisao {
  usuarioId: number;
  usuarioNome: string;
  horas: number;
}

export interface Atividade {
  id: number;
  paiId: number | null;
  nome: string;
  categoriaId: number | null;
  categoriaNome: string | null;
  horas: number | null;
  responsavelId: number | null;
  responsavelNome: string | null;
  indivisivel: boolean;
  doCliente: boolean;
  diasCliente: number;
  contatoClienteId: number | null;
  contatoClienteNome: string | null;
  ordem: number;
  dependeDe: number[];
  distribuicao: Divisao[];
}

export interface AtividadeRequest {
  nome: string;
  paiId: number | null;
  categoriaId: number | null;
  horas: number | null;
  responsavelId: number | null;
  indivisivel: boolean;
  doCliente: boolean;
  diasCliente: number;
  contatoClienteId: number | null;
  ordem: number | null;
}

export interface Deslocamento {
  id: number;
  usuarioId: number;
  usuarioNome: string;
  data: string;
  horas: number;
  descricao: string | null;
}

export interface DeslocamentoRequest {
  usuarioId: number;
  data: string;
  horas: number;
  descricao?: string | null;
}

export interface FeriadoExtra {
  id: number;
  data: string;
  descricao: string | null;
}

export interface LinhaCalculo {
  atividadeId: number;
  nome: string;
  inicio: string | null;
  fim: string | null;
  horas: number;
  resumo: boolean;
  doCliente: boolean;
}

export interface Alocacao {
  usuarioId: number;
  usuarioNome: string;
  atividadeId: number | null;
  data: string;
  horas: number;
  tipo: TipoAlocacao;
}

export interface Conflito {
  usuarioId: number;
  usuarioNome: string;
  semana: string;
  horas: number;
  mensagem: string;
}

export interface Calculo {
  calculadoEm: string;
  kickoff: string;
  inicio: string;
  termino: string;
  diasUteis: number;
  horasServico: number;
  horasViagem: number;
  custoInterno: number;
  horasContratadas: number | null;
  saldoContrato: number | null;
  atividades: LinhaCalculo[];
  alocacoes: Alocacao[];
  conflitos: Conflito[];
}

export interface PlanejamentoResumo {
  id: number;
  clienteId: number;
  clienteNome: string;
  levantamentoId: number | null;
  nome: string;
  situacao: SituacaoPlanejamento;
  templateNome: string | null;
  templateVersao: number | null;
  kickoff: string | null;
  inicioCalculado: string | null;
  terminoCalculado: string | null;
  responsavelId: number | null;
  responsavelNome: string | null;
  calculadoEm: string | null;
  calculoDesatualizado: boolean;
  atualizadoEm: string;
}

export interface Planejamento extends PlanejamentoResumo {
  clienteCidade: string | null;
  clienteUf: string | null;
  horasContratadas: number | null;
  custoHoraServico: number | null;
  custoHoraViagem: number | null;
  observacao: string | null;
  atividades: Atividade[];
  deslocamentos: Deslocamento[];
  feriadosExtras: FeriadoExtra[];
  calculo: Calculo | null;
  criadoEm: string;
}

export interface PaginaPlanejamentos {
  planejamentos: PlanejamentoResumo[];
  pagina: number;
  totalPaginas: number;
  totalItens: number;
}

export interface PlanejamentoDadosRequest {
  nome: string;
  levantamentoId?: number | null;
  kickoff?: string | null;
  horasContratadas?: number | null;
  custoHoraServico?: number | null;
  custoHoraViagem?: number | null;
  responsavelId?: number | null;
  observacao?: string | null;
}

export interface PlanejamentoCriacaoRequest extends PlanejamentoDadosRequest {
  clienteId: number;
}

export interface FiltroPlanejamentos {
  situacao?: SituacaoPlanejamento;
  responsavelId?: number;
  busca?: string;
  pagina?: number;
  tamanho?: number;
}

export interface CargaDia {
  usuarioId: number;
  usuarioNome: string;
  data: string;
  horas: number;
  planejamentos: { planejamentoId: number; nome: string; horas: number }[];
}

/** Analista que pode ser responsável ou receber parte das horas. */
export interface Analista {
  id: number;
  nome: string;
}
