import { Activity, Briefcase, FolderKanban, LifeBuoy, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Perfil } from './types/api';

export interface Modulo {
  id: string;
  label: string;
  descricao: string;
  icone: LucideIcon;
  /** Rota base: tudo sob ela pertence ao módulo (menu acende, ProtectedRoute guarda). */
  rota: string;
  /** Quem acessa. ADMIN e DIRETORIA veem tudo, mas ficam explícitos para a regra ser lida num lugar só. */
  perfis: Perfil[];
  /** `false`: ainda não existe — fica fora do menu, da home e do router. */
  ativo: boolean;
}

// Regras de acesso do portal. Isto só esconde telas: quem barra de verdade é o backend (@PreAuthorize).
export const modulos: Modulo[] = [
  {
    id: 'comercial',
    label: 'Comercial',
    descricao: 'Validador de Infraestrutura',
    icone: Briefcase,
    rota: '/comercial',
    perfis: ['ADMIN', 'DIRETORIA', 'COMERCIAL', 'TECNICO'],
    ativo: true,
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    descricao: 'Consistência e encerramento das lojas dos clientes',
    icone: Activity,
    rota: '/monitoramento',
    perfis: ['ADMIN', 'SUPORTE', 'DIRETORIA'],
    ativo: true,
  },
  {
    id: 'suporte',
    label: 'Suporte',
    descricao: 'Atendimento e chamados',
    icone: LifeBuoy,
    rota: '/suporte',
    perfis: ['ADMIN', 'DIRETORIA', 'SUPORTE'],
    ativo: false,
  },
  {
    id: 'diretoria',
    label: 'Diretoria',
    descricao: 'Indicadores e visão geral',
    icone: TrendingUp,
    rota: '/diretoria',
    perfis: ['ADMIN', 'DIRETORIA'],
    ativo: false,
  },
  {
    id: 'projetos',
    label: 'Projetos',
    descricao: 'Implantações e cronogramas',
    icone: FolderKanban,
    rota: '/projetos',
    perfis: ['ADMIN', 'DIRETORIA', 'PROJETOS'],
    ativo: false,
  },
];

export function podeAcessar(modulo: Modulo, perfil?: Perfil) {
  return modulo.ativo && !!perfil && modulo.perfis.includes(perfil);
}

export function modulosDoPerfil(perfil?: Perfil) {
  return modulos.filter((m) => podeAcessar(m, perfil));
}

export function modulo(id: string) {
  const m = modulos.find((x) => x.id === id);
  if (!m) throw new Error(`Módulo desconhecido: ${id}`);
  return m;
}
