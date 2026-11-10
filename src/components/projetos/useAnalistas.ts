import { useQuery } from '@tanstack/react-query';
import { usuariosApi } from '../../api/usuarios';
import { planejamentosApi } from '../../api/projetos';
import { deveRetentar } from '../../api/erro';
import { useAuthStore, useIsAdmin } from '../../stores/authStore';
import { hojeIso } from '../../labels';
import { ehEditor, somarDias } from '../../projetos';
import type { Analista } from '../../types/projetos';

/**
 * Quem pode ser responsável ou receber horas.
 *
 * ADMIN e DIRETORIA leem `/usuarios`. Para o PROJETOS esse endpoint é 403 e ainda não existe uma lista de analistas
 * no módulo, então a lista sai da carga da equipe (quem tem alocação perto de hoje), do próprio usuário e de quem já
 * aparece no planejamento aberto (`conhecidos`).
 */
export function useAnalistas(conhecidos: Analista[] = []): Analista[] {
  const isAdmin = useIsAdmin();
  const usuario = useAuthStore((s) => s.usuario);
  const editor = ehEditor(usuario?.perfil);

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.listar,
    enabled: isAdmin,
    staleTime: 5 * 60_000,
    retry: deveRetentar,
  });

  const hoje = hojeIso();
  const { data: carga } = useQuery({
    queryKey: ['projetos', 'carga', 'analistas'],
    queryFn: () => planejamentosApi.carga(somarDias(hoje, -120), somarDias(hoje, 240)),
    enabled: editor && !isAdmin,
    staleTime: 5 * 60_000,
    retry: deveRetentar,
  });

  const mapa = new Map<number, string>();
  if (usuarios) {
    usuarios.filter((u) => u.ativo).forEach((u) => mapa.set(u.id, u.nome));
  } else {
    carga?.forEach((c) => mapa.set(c.usuarioId, c.usuarioNome));
    if (usuario && editor) mapa.set(usuario.id, usuario.nome);
  }
  conhecidos.forEach((a) => {
    if (!mapa.has(a.id)) mapa.set(a.id, a.nome);
  });
  return [...mapa].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
}
