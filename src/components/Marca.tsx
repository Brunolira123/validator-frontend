interface Props {
  /** `escuro` = texto branco (sidebar/topbar); `claro` = texto grafite (login). */
  tema?: 'escuro' | 'claro';
  compacto?: boolean;
}

/**
 * Wordmark do app: ícone oficial (VRUtil.ico, o mesmo do PWA e do favicon) + nome.
 */
export function Marca({ tema = 'escuro', compacto = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/icons/icon-192.png"
        alt=""
        aria-hidden="true"
        className={`shrink-0 ${compacto ? 'h-8 w-8' : 'h-10 w-10'}`}
      />
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
