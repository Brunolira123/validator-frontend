import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Store } from 'lucide-react';
import { prospeccaoApi } from '../api/prospeccao';

interface Props {
  /** Relativa à base da API (vem do backend); null = lugar sem foto. */
  fotoUrl: string | null;
  className?: string;
  /** Crédito do autor, sobre a foto: só aparece com a foto carregada. */
  credito?: ReactNode;
}

/**
 * Foto do Google pelo proxy do backend. Precisa do Bearer, então é baixada como blob, e só quando o card
 * entra na tela: cada foto nova conta no limite diário do backend.
 * Sem foto, carregando ou com erro (inclusive limite estourado): placeholder de loja.
 */
export function FotoLugar({ fotoUrl, className = '', credito }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  // A imagem carregada fica presa à URL de origem: se fotoUrl mudar (card reaproveitado), a foto antiga
  // some na hora, sem esperar a nova chegar
  const [carregada, setCarregada] = useState<{ de: string; src: string } | null>(null);
  const src = carregada && carregada.de === fotoUrl ? carregada.src : null;

  useEffect(() => {
    const el = ref.current;
    if (!el || !fotoUrl) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fotoUrl]);

  useEffect(() => {
    if (!visivel || !fotoUrl) return;
    const controle = new AbortController();
    let objectUrl: string | null = null;
    prospeccaoApi
      .foto(fotoUrl, controle.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setCarregada({ de: fotoUrl, src: objectUrl });
      })
      .catch(() => {
        // Placeholder: sem foto, limite diário de fotos ou Google fora do ar
      });
    return () => {
      controle.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visivel, fotoUrl]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      {src ? (
        <>
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover animate-fade-in" />
          {credito && (
            <p className="absolute inset-x-0 bottom-0 px-3 pt-4 pb-1.5 text-[11px] text-white truncate bg-gradient-to-t from-neutral-950/70 to-transparent">
              {credito}
            </p>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
          <Store size={28} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
