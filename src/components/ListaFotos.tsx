import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { equipamentosApi } from '../api/equipamentos';
import { mensagemErro } from '../api/erro';
import { ErrorAlert } from './ErrorAlert';
import { ConfirmarExclusao } from './ConfirmarExclusao';
import type { FotoResponse } from '../types/api';

interface Props {
  equipamentoId: number;
  /** ADMIN com levantamento editável (mesma regra do backend). */
  podeExcluir?: boolean;
}

export function ListaFotos({ equipamentoId, podeExcluir = false }: Props) {
  const queryClient = useQueryClient();
  const [paraExcluir, setParaExcluir] = useState<FotoResponse | null>(null);

  const { data: fotos, isLoading, error } = useQuery({
    queryKey: ['fotos', equipamentoId],
    queryFn: () => equipamentosApi.listarFotos(equipamentoId),
  });

  const [urls, setUrls] = useState<Record<number, string>>({});

  const excluirMutation = useMutation({
    mutationFn: (fotoId: number) => equipamentosApi.excluirFoto(equipamentoId, fotoId),
    onSuccess: async () => {
      setParaExcluir(null);
      await queryClient.invalidateQueries({ queryKey: ['fotos', equipamentoId] });
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
  });

  useEffect(() => {
    if (!fotos) return;
    let cancelado = false;
    const criados: string[] = [];

    Promise.all(
      fotos.map(async (foto) => {
        try {
          const url = await equipamentosApi.carregarFotoBlob(equipamentoId, foto.id);
          // Request terminou depois do cleanup: ninguém mais vai revogar esse URL
          if (cancelado) {
            URL.revokeObjectURL(url);
            return null;
          }
          criados.push(url);
          return [foto.id, url] as const;
        } catch {
          return null;
        }
      })
    ).then((pares) => {
      if (cancelado) return;
      setUrls(Object.fromEntries(pares.filter((p) => p !== null)));
    });

    return () => {
      cancelado = true;
      criados.forEach(URL.revokeObjectURL);
    };
  }, [fotos, equipamentoId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="w-full h-32 bg-neutral-100 rounded-lg animate-pulse" />
        <div className="w-full h-32 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert>{mensagemErro(error, 'Erro ao carregar fotos')}</ErrorAlert>;
  }

  if (!fotos || fotos.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-400">
        <ImageIcon size={24} className="mx-auto mb-2" />
        <p className="text-xs">Nenhuma foto enviada ainda</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-2 gap-3">
      {fotos.map((foto) => (
        <div key={foto.id} className="relative">
          {urls[foto.id] ? (
            <img
              src={urls[foto.id]}
              alt={foto.nomeOriginal || `Foto ${foto.sequencia}`}
              className="w-full h-32 object-cover rounded-lg border border-neutral-200"
            />
          ) : (
            <div className="w-full h-32 bg-neutral-100 rounded-lg animate-pulse" />
          )}
          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            #{foto.sequencia}
          </span>
          {podeExcluir && (
            <button
              type="button"
              onClick={() => setParaExcluir(foto)}
              aria-label={`Excluir foto ${foto.sequencia}`}
              title="Excluir foto"
              className="absolute top-1 right-1 h-11 w-11 md:h-8 md:w-8 flex items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-md hover:bg-white hover:text-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>

    {paraExcluir && (
      <ConfirmarExclusao
        titulo={`Excluir foto #${paraExcluir.sequencia}?`}
        excluindo={excluirMutation.isPending}
        erro={excluirMutation.error ? mensagemErro(excluirMutation.error, 'Erro ao excluir foto') : null}
        onConfirmar={() => excluirMutation.mutate(paraExcluir.id)}
        onCancelar={() => {
          setParaExcluir(null);
          excluirMutation.reset();
        }}
      >
        <p>A foto deixa de aparecer e não é usada na próxima análise. A análise já feita não muda.</p>
      </ConfirmarExclusao>
    )}
    </>
  );
}
