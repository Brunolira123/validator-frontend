import type { FuncaoEquipamento, Perfil } from './types/api';

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

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

/** ISO (com fuso) → "15/10/2026 07:00" no horário do navegador. */
export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

/** "2026-10-14" (LocalDate) → "14/10". UTC para não voltar um dia em fusos negativos. */
export function formatarDiaMes(data: string): string {
  return dataCurta.format(new Date(`${data}T00:00:00Z`));
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
