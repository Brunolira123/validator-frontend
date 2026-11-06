// ===== Auth =====
export interface LoginRequest {
  login: string;
  senha: string;
}

export type Perfil = 'ADMIN' | 'COMERCIAL' | 'TECNICO' | 'SUPORTE' | 'DIRETORIA' | 'PROJETOS';

export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
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
  /** Selo do público-alvo (Lucro Real). Só informativo: não bloqueia nada. */
  perfil?: PerfilTributario;
}

export interface PerfilTributario {
  simples: boolean | null;
  mei: boolean | null;
  porte: string | null;
  regimeTributario: string | null;
  regimeAno: number | null;
  foraDoPerfil: boolean;
  motivo: string | null;
}

// ===== Prospecção (Google Places) =====
export type CategoriaProspeccao =
  | 'SUPERMERCADO'
  | 'HIPERMERCADO'
  | 'MERCADO'
  | 'ATACADO'
  | 'HORTIFRUTI'
  | 'ACOUGUE'
  | 'PEIXARIA'
  | 'PADARIA'
  | 'CONVENIENCIA'
  | 'EMPORIO'
  | 'BEBIDAS';

/** NOVO -> VISITADO -> FECHADO (virou Cliente) -> LTO (Levantamento). Saídas: PERDIDO (após visita) e DESCARTADO. */
export type StatusProspect = 'NOVO' | 'VISITADO' | 'FECHADO' | 'LTO' | 'PERDIDO' | 'DESCARTADO';
export type MotivoPerda = 'PRECO' | 'CONCORRENTE' | 'SEM_INTERESSE' | 'OUTRO';
export type ResultadoVisita = 'ATENDEU' | 'NAO_ATENDEU';
export type TemperaturaNegociacao = 'FRIA' | 'MORNA' | 'QUENTE';
export type OrigemProspect = 'GOOGLE' | 'MANUAL' | 'CRM';

/** Lugar do Google, só para exibir (nada disso fica no banco, só o placeId). */
export interface LugarEncontrado {
  placeId: string;
  nome: string | null;
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  categorias: CategoriaProspeccao[];
  /** Relativa à base da API e exige o Bearer: baixar como blob (FotoLugar). */
  fotoUrl: string | null;
  fotoAutor: string | null;
  fotoAutorUrl: string | null;
  googleMapsUrl: string | null;
  rotaUrl: string;
  statusFuncionamento: string | null;
  /** Preenchidos quando o lugar já é prospect de quem buscou (ou para ADMIN/DIRETORIA). */
  prospectId: number | null;
  statusProspect: StatusProspect | null;
  temperatura: TemperaturaNegociacao | null;
  /** Prospect de outro comercial: sem id nem status, e sem ações de funil. */
  deOutroComercial: boolean;
}

export interface PaginaBuscaProspect {
  lugares: LugarEncontrado[];
  /** Token opaco do "carregar mais"; null = acabou. */
  proximaPagina: string | null;
}

export interface SalvarProspectRequest {
  placeId: string;
  cidade: string;
  uf: string;
  categoria?: CategoriaProspeccao;
}

export interface ProspectResponse {
  id: number;
  origem: OrigemProspect;
  placeId: string | null;
  nome: string | null;
  cidade: string;
  uf: string;
  categoria: CategoriaProspeccao | null;
  status: StatusProspect;
  resultadoVisita: ResultadoVisita | null;
  temperatura: TemperaturaNegociacao | null;
  visitadoEm: string | null;
  observacao: string | null;
  responsavelId: number;
  responsavelNome: string;
  clienteId: number | null;
  /** LocalDate do fechamento do contrato. */
  fechadoEm: string | null;
  motivoPerda: MotivoPerda | null;
  observacaoPerda: string | null;
  criadoEm: string;
  /** null quando o Google não respondeu, o lugar sumiu ou o limite diário acabou. Respostas de POST vêm sempre null. */
  lugar: LugarEncontrado | null;
  /** Selo do CNPJ: só na resposta do fechamento (e null se a Receita estiver fora do ar). */
  perfil?: PerfilTributario | null;
}

export interface PaginaProspects {
  prospects: ProspectResponse[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

export interface VisitaProspectRequest {
  resultado: ResultadoVisita;
  temperatura?: TemperaturaNegociacao;
  observacao?: string;
  latitude?: number;
  longitude?: number;
}

export interface FecharProspectRequest {
  cnpj: string;
  /** yyyy-MM-dd; padrão hoje no backend. */
  dataFechamento?: string;
  observacao?: string;
}

export interface PerderProspectRequest {
  motivo: MotivoPerda;
  observacao?: string;
}

/** O cliente vem do fechamento: só o dimensionamento do levantamento. */
export interface LtoProspectRequest {
  qtdServidores?: number;
  qtdPdvs?: number;
  qtdRetaguardas?: number;
  consultaPreco?: boolean;
  qtdConsultaPreco?: number;
  outros?: string;
}

export interface LtoProspectResponse {
  clienteId: number;
  levantamentoId: number;
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
// ===== Monitoramento (agentes nos clientes) =====
export type SituacaoMonitor = 'AGUARDANDO' | 'OK' | 'FALHA' | 'OFFLINE' | 'INATIVO';
export type OrigemExecucao = 'AGENDADO' | 'SOB_DEMANDA';
export type StatusPedido = 'PENDENTE' | 'ENTREGUE' | 'CONCLUIDO' | 'EXPIRADO';

export interface ClienteMonitoradoRequest {
  nome: string;
  cnpj?: string;
}

export interface ClienteMonitoradoResponse {
  id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  situacao: SituacaoMonitor;
  ultimoContato: string | null;
  versaoAgente: string | null;
  ultimaExecucaoEm: string | null;
  totalLojas: number;
  lojasComFalha: number;
  /** Da última execução. null = agente antigo ou não deu para ler no banco do cliente. */
  versaoBanco: string | null;
  encerramentoAutomatico: boolean | null;
  consistenciaAutomatica: boolean | null;
}

/** NFC-e de ontem não transmitida: o que costuma segurar a consistência da loja. */
export interface NfceNaoTransmitida {
  contingencia: boolean;
  /** Preenchido = rejeitada pela SEFAZ. */
  motivoRejeicao: string | null;
}

export interface VerificacaoMonitor {
  tipo: string;
  ok: boolean;
  referencia: string | null;
  detalhe: string | null;
}

export interface LojaMonitorada {
  lojaId: number;
  cnpj: string | null;
  descricao: string | null;
  ok: boolean;
  verificacoes: VerificacaoMonitor[];
  nfceNaoTransmitidas: NfceNaoTransmitida[];
}

export interface ClienteMonitoradoDetalhe {
  cliente: ClienteMonitoradoResponse;
  /** A última execução não conseguiu consultar o banco do cliente. */
  erro: string | null;
  lojas: LojaMonitorada[];
}

/** Única vez em que o token aparece. */
export interface TokenAgenteResponse {
  cliente: ClienteMonitoradoResponse;
  token: string;
}

export interface ExecucaoMonitor {
  id: number;
  origem: OrigemExecucao;
  executadoEm: string;
  recebidoEm: string;
  ok: boolean;
  erro: string | null;
  totalLojas: number;
  lojasComFalha: number;
}

export interface PedidoConsulta {
  id: number;
  clienteId: number;
  status: StatusPedido;
  criadoEm: string;
  concluidoEm: string | null;
  execucaoId: number | null;
}

// ===== Usuários (administração) =====
export interface UsuarioAdmin {
  id: number;
  login: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
}

export interface UsuarioCriacaoRequest {
  login: string;
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
}

export interface UsuarioAtualizacaoRequest {
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  /** Vazio mantém a senha atual. */
  senha?: string;
}

// ===== Suporte (ambiente dos clientes, enviado pelo agente) =====
export type SituacaoAgente = 'ONLINE' | 'OFFLINE';

export interface ContainerAmbiente {
  nome: string;
  versao: string | null;
  rodando: boolean;
}

export interface AmbienteCliente {
  /** Quando o agente coletou (relógio do cliente). */
  coletadoEm: string;
  recebidoEm: string;
  dockerDisponivel: boolean;
  /** Preenchido quando o Docker não respondeu. */
  erro: string | null;
  total: number;
  rodando: number;
  parados: number;
  /** Parados primeiro, depois por nome. */
  containers: ContainerAmbiente[];
}

export interface SuporteClienteResponse {
  id: number;
  nome: string;
  situacao: SituacaoAgente;
  ultimoContato: string | null;
  /** Versão do BD (VRMaster), da última execução. */
  versaoBanco: string | null;
  versaoAgente: string | null;
  /** null: o agente nunca enviou o ambiente (versão antiga). */
  ambiente: AmbienteCliente | null;
}
