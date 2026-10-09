import type { FuncaoEquipamento } from './types/api';

export const funcaoLabel: Record<FuncaoEquipamento, string> = {
  BANCO_DADOS: 'Banco de Dados',
  APLICACAO: 'Aplicação',
  SERVICE_MANAGER: 'Service Manager',
  PDV: 'PDV',
  RETAGUARDA: 'Retaguarda',
  CONSULTA_PRECO: 'Consulta de Preço',
  OUTRO: 'Outro',
};

/** 14 caracteres (numérico ou alfanumérico) → 00.000.000/0000-00. Outros formatos passam intactos. */
export function formatarCnpj(cnpj: string): string {
  const c = cnpj.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
