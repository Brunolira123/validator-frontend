// ===== Auth =====
export interface LoginRequest {
  login: string;
  senha: string;
}

export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'COMERCIAL' | 'TECNICO';
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEm: number;
  refreshToken: string;
  usuario: UsuarioResponse;
}

export interface TokenResponse {
  token: string;
  tipo: string;
  expiraEm: number;
}

// ===== Cliente =====
export interface ClienteRequest {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
}

export interface ClienteResponse {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
}

export interface CnpjResponseDTO {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
}

// ===== Levantamento =====
export interface LevantamentoRequest {
  clienteId: number;
  qtdServidores: number;
  qtdPdvs: number;
  qtdRetaguardas: number;
  consultaPreco: boolean;
  qtdConsultaPreco?: number;
  outros?: string;
}

export type StatusLevantamento = 'RASCUNHO' | 'EM_ANALISE' | 'CONCLUIDO' | 'CANCELADO';

export interface LevantamentoResponse {
  id: number;
  clienteId: number;
  clienteRazaoSocial: string;
  usuarioId: number;
  usuarioNome: string;
  qtdServidores: number;
  qtdPdvs: number;
  qtdRetaguardas: number;
  consultaPreco: boolean;
  qtdConsultaPreco: number;
  outros?: string;
  status: StatusLevantamento;
  criadoEm: string;
}

// ===== Equipamento =====
export type CategoriaEquipamento = 'SERVIDOR' | 'PDV' | 'RETAGUARDA' | 'CONSULTA_PRECO' | 'OUTRO';
export type FuncaoEquipamento =
  | 'BANCO_DADOS' | 'APLICACAO' | 'SERVICE_MANAGER'
  | 'PDV' | 'RETAGUARDA' | 'CONSULTA_PRECO' | 'OUTRO';
export type StatusAnalise = 'PENDENTE' | 'EM_ANALISE' | 'ATENDE' | 'NAO_ATENDE' | 'REQUER_ANALISE' | 'ERRO';

export interface EquipamentoResponse {
  id: number;
  categoria: CategoriaEquipamento;
  funcao: FuncaoEquipamento;
  sequencia: number;
  status: StatusAnalise;
  qtdFotos: number;
}

export interface FotoResponse {
  id: number;
  nomeOriginal?: string;
  contentType: string;
  tamanhoBytes: number;
  sequencia: number;
  criadoEm: string;
}

// ===== Análise =====
export interface ItemAvaliadoDTO {
  campo: string;
  valorEncontrado: string | null;
  requisito: string;
  status: StatusAnalise;
  observacao: string;
}

export interface ResultadoAnaliseDTO {
  resultado: StatusAnalise;
  itens: ItemAvaliadoDTO[];
  justificativa: string;
}

export interface AnaliseResponse {
  resultado: StatusAnalise;
  justificativa: string | null;
  itens: ItemAvaliadoDTO[];
  fabricante: string | null;
  modelo: string | null;
  cpuFabricante: string | null;
  cpuModelo: string | null;
  cpuGeracao: number | null;
  cpuCores: number | null;
  cpuThreads: number | null;
  ramGb: number | null;
  armazenamentoTipo: string | null;
  armazenamentoGb: number | null;
  soNome: string | null;
  soVersao: string | null;
  confiancaGlobal: number | null;
  analisadoEm: string | null;
  analisadoPorNome: string | null;
  revisada: boolean;
}

export interface RevisaoAnaliseRequest {
  fabricante?: string;
  modelo?: string;
  cpuFabricante?: string;
  cpuModelo?: string;
  cpuGeracao?: number;
  cpuCores?: number;
  cpuThreads?: number;
  ramGb?: number;
  armazenamentoTipo?: string;
  armazenamentoGb?: number;
  soNome?: string;
  soVersao?: string;
  observacoes?: string;
}

// ===== Relatório =====
export interface RelatorioLevantamentoDTO {
  levantamentoId: number;
  clienteId: number;
  clienteRazaoSocial: string;
  clienteCnpj: string;
  comercialNome: string;
  data: string;
  resumo: {
    servidores: number;
    pdvs: number;
    retaguardas: number;
    consultaPreco: number;
  };
  resultados: {
    total: number;
    atende: number;
    naoAtende: number;
    requerAnalise: number;
    pendente: number;
  };
  equipamentos: EquipamentoDetalhe[];
}

export interface EquipamentoDetalhe {
  id: number;
  categoria: CategoriaEquipamento;
  funcao: FuncaoEquipamento;
  sequencia: number;
  status: StatusAnalise;
  resultado: StatusAnalise | null;
  justificativa: string | null;
  analise: AnaliseResumo | null;
}

export interface AnaliseResumo {
  fabricante?: string;
  modelo?: string;
  cpuModelo?: string;
  cpuGeracao?: number;
  ramGb?: number;
  soNome?: string;
  confiancaGlobal?: number;
}

// ===== Erro =====
export interface ErroResponse {
  mensagem: string;
  timestamp: string;
  path: string;
  campos?: Array<{ campo: string; mensagem: string }>;
}