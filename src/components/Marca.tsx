interface Props {
  /** `escuro` = texto branco (sidebar/topbar); `claro` = texto grafite (login). */
  tema?: 'escuro' | 'claro';
  compacto?: boolean;
}

/**
 * Wordmark do app. O "VR" usa o degradê do logo da VR Software (#EA5B0C → #FF9E01).
 * Se houver autorização para usar o logo oficial, troque o selo pelo SVG.
 */
export function Marca({ tema = 'escuro', compacto = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-vr-600 to-[#ff9e01] font-extrabold text-white shadow-sm ${
          compacto ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'
        }`}
      >
        VR
      </span>
      <div className="leading-tight">
        <p className={`font-bold ${compacto ? 'text-base' : 'text-lg'} ${tema === 'escuro' ? 'text-white' : 'text-neutral-900'}`}>
          Validador
        </p>
        {!compacto && (
          <p className={`text-xs ${tema === 'escuro' ? 'text-white/60' : 'text-neutral-500'}`}>
            Infraestrutura
          </p>
        )}
      </div>
    </div>
  );
}
