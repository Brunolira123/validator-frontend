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
