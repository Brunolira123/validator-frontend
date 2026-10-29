import type {
  CategoriaProspeccao,
  FuncaoEquipamento,
  MotivoPerda,
  Perfil,
  StatusProspect,
  TemperaturaNegociacao,
} from './types/api';

export const funcaoLabel: Record<FuncaoEquipamento, string> = {
  BANCO_DADOS: 'Banco de Dados',
  APLICACAO: 'Aplicação',
  SERVICE_MANAGER: 'Service Manager',
  PDV: 'PDV',
  RETAGUARDA: 'Retaguarda',
  CONSULTA_PRECO: 'Consulta de Preço',
  OUTRO: 'Outro',
};

export const perfilLabel: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  DIRETORIA: 'Diretoria',
  COMERCIAL: 'Comercial',
  TECNICO: 'Técnico',
  SUPORTE: 'Suporte',
  PROJETOS: 'Projetos',
};

/** Na ordem em que aparecem nos filtros da busca de prospects. */
export const categoriaProspeccaoLabel: Record<CategoriaProspeccao, string> = {
  SUPERMERCADO: 'Supermercado',
  HIPERMERCADO: 'Hipermercado',
  MERCADO: 'Mercado e mercearia',
  ATACADO: 'Atacado e atacarejo',
  HORTIFRUTI: 'Hortifrúti',
  ACOUGUE: 'Açougue',
  PEIXARIA: 'Peixaria',
  PADARIA: 'Padaria',
  CONVENIENCIA: 'Conveniência',
  EMPORIO: 'Empório',
  BEBIDAS: 'Bebidas e adega',
};

export const categoriasProspeccao = Object.keys(categoriaProspeccaoLabel) as CategoriaProspeccao[];

/** Grupos do filtro de categorias (painel no celular, inline no desktop). */
export const gruposCategoriaProspeccao: { titulo: string; categorias: CategoriaProspeccao[] }[] = [
  { titulo: 'Mercados', categorias: ['SUPERMERCADO', 'HIPERMERCADO', 'MERCADO', 'ATACADO'] },
  { titulo: 'Perecíveis', categorias: ['HORTIFRUTI', 'ACOUGUE', 'PEIXARIA', 'PADARIA'] },
  { titulo: 'Outros', categorias: ['CONVENIENCIA', 'EMPORIO', 'BEBIDAS'] },
];

export const statusProspectLabel: Record<StatusProspect, string> = {
  NOVO: 'Novo',
  VISITADO: 'Visitado',
  FECHADO: 'Fechado',
  LTO: 'LTO',
  PERDIDO: 'Perdido',
  DESCARTADO: 'Descartado',
};

export const motivoPerdaLabel: Record<MotivoPerda, string> = {
  PRECO: 'Preço',
  CONCORRENTE: 'Concorrente',
  SEM_INTERESSE: 'Sem interesse',
  OUTRO: 'Outro',
};

export const temperaturaLabel: Record<TemperaturaNegociacao, string> = {
  FRIA: 'Fria',
  MORNA: 'Morna',
  QUENTE: 'Quente',
};

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const dataCompleta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

/** ISO (com fuso) → "15/10/2026 07:00" no horário do navegador. */
export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

/** "2026-10-14" (LocalDate) → "14/10". UTC para não voltar um dia em fusos negativos. */
export function formatarDiaMes(data: string): string {
  return dataCurta.format(new Date(`${data}T00:00:00Z`));
}

/** "2026-10-29" (LocalDate) → "29/10/2026". UTC para não voltar um dia em fusos negativos. */
export function formatarData(data: string): string {
  return dataCompleta.format(new Date(`${data}T00:00:00Z`));
}

/** Hoje no fuso do aparelho, como yyyy-MM-dd (valor de input type="date"). */
export function hojeIso(): string {
  return new Date().toLocaleDateString('sv-SE');
}

/** Máscara progressiva de CNPJ numérico: 12345678000190 → 12.345.678/0001-90. */
export function mascararCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias". */
export function tempoDesde(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/** CONSISTENCIA → "Consistência". Tipos novos do agente aparecem capitalizados. */
export function verificacaoLabel(tipo: string): string {
  const conhecidos: Record<string, string> = { CONSISTENCIA: 'Consistência', ENCERRAMENTO: 'Encerramento' };
  return conhecidos[tipo] ?? tipo.charAt(0) + tipo.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** 14 caracteres (numérico ou alfanumérico) → 00.000.000/0000-00. Outros formatos passam intactos. */
export function formatarCnpj(cnpj: string): string {
  const c = cnpj.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
