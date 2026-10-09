import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon } from 'lucide-react';
import { equipamentosApi } from '../api/equipamentos';

interface Props {
  equipamentoId: number;
}

export function ListaFotos({ equipamentoId }: Props) {
  const { data: fotos } = useQuery({
    queryKey: ['fotos', equipamentoId],
    queryFn: () => equipamentosApi.listarFotos(equipamentoId),
  });

  const [urls, setUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!fotos) return;
    const novosUrls: Record<number, string> = {};
    let cancelado = false;

    (async () => {
      for (const foto of fotos) {
        try {
          const url = await equipamentosApi.carregarFotoBlob(equipamentoId, foto.id);
          if (!cancelado) novosUrls[foto.id] = url;
        } catch {
          // ignora
        }
      }
      if (!cancelado) setUrls(novosUrls);
    })();

    return () => {
      cancelado = true;
      Object.values(novosUrls).forEach(URL.revokeObjectURL);
    };
  }, [fotos, equipamentoId]);

  if (!fotos || fotos.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400">
        <ImageIcon size={24} className="mx-auto mb-2" />
        <p className="text-xs">Nenhuma foto enviada ainda</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {fotos.map((foto) => (
        <div key={foto.id} className="relative">
          {urls[foto.id] ? (
            <img
              src={urls[foto.id]}
              alt={foto.nomeOriginal || `Foto ${foto.sequencia}`}
              className="w-full h-32 object-cover rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-full h-32 bg-slate-100 rounded-lg animate-pulse" />
          )}
          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            #{foto.sequencia}
          </span>
        </div>
      ))}
    </div>
  );
}