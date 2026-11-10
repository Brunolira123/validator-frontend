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
  /** Telas do módulo, abertas no menu quando ele está ativo. Sem `perfis`, valem as do módulo. */
  submenu?: { rota: string; label: string; perfis?: Perfil[] }[];
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
    descricao: 'Ambiente e containers dos clientes',
    icone: LifeBuoy,
    rota: '/suporte',
    perfis: ['ADMIN', 'DIRETORIA', 'SUPORTE'],
    ativo: true,
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
    // COMERCIAL só lê os planejamentos dos clientes que ele fechou; cadastros são dos editores
    perfis: ['ADMIN', 'DIRETORIA', 'PROJETOS', 'COMERCIAL'],
    ativo: true,
    submenu: [
      { rota: '/projetos/planejamentos', label: 'Planejamentos' },
      { rota: '/projetos/templates', label: 'Templates', perfis: ['ADMIN', 'DIRETORIA', 'PROJETOS'] },
      { rota: '/projetos/categorias', label: 'Categorias', perfis: ['ADMIN', 'DIRETORIA', 'PROJETOS'] },
      { rota: '/projetos/feriados', label: 'Feriados', perfis: ['ADMIN', 'DIRETORIA', 'PROJETOS'] },
    ],
  },
];

export function podeAcessar(modulo: Modulo, perfil?: Perfil) {
  return modulo.ativo && !!perfil && modulo.perfis.includes(perfil);
}

/** Itens do submenu que o perfil vê. */
export function submenuDoPerfil(modulo: Modulo, perfil?: Perfil) {
  return (modulo.submenu ?? []).filter((i) => !!perfil && (i.perfis ?? modulo.perfis).includes(perfil));
}

export function modulosDoPerfil(perfil?: Perfil) {
  return modulos.filter((m) => podeAcessar(m, perfil));
}

export function modulo(id: string) {
  const m = modulos.find((x) => x.id === id);
  if (!m) throw new Error(`Módulo desconhecido: ${id}`);
  return m;
}
