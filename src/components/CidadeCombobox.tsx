import { useId, useState, type KeyboardEvent } from 'react';
import { sugerirMunicipios } from '../municipios';

interface Props {
  valor: string;
  onChange: (valor: string) => void;
  error?: string;
  /** Sem rótulo visível (barra compacta); o nome acessível continua "Cidade". */
  rotuloOculto?: boolean;
}

/**
 * Combobox de municípios de SP (padrão ARIA 1.2, lista com autocomplete): até 8 sugestões sem acento,
 * setas + Enter + Esc no teclado e toque na sugestão. O texto livre só vira busca se for da lista.
 */
export function CidadeCombobox({ valor, onChange, error, rotuloOculto = false }: Props) {
  const id = useId();
  const listaId = `${id}-lista`;
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);

  const sugestoes = sugerirMunicipios(valor);
  // Já escolhida: não insiste em mostrar ela mesma
  const jaEscolhida = sugestoes.length === 1 && sugestoes[0] === valor;
  const mostrar = aberta && sugestoes.length > 0 && !jaEscolhida;

  const escolher = (nome: string) => {
    onChange(nome);
    setAberta(false);
    setAtiva(-1);
  };

  const teclado = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!sugestoes.length) return;
      setAberta(true);
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setAtiva((a) => (a + passo + sugestoes.length) % sugestoes.length);
    } else if (e.key === 'Enter' && mostrar && ativa >= 0) {
      // Enter numa sugestão escolhe; sem sugestão ativa, segue e envia o formulário
      e.preventDefault();
      escolher(sugestoes[ativa]);
    } else if (e.key === 'Escape' && mostrar) {
      e.preventDefault();
      e.stopPropagation();
      setAberta(false);
      setAtiva(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className={rotuloOculto ? 'sr-only' : 'block text-sm font-medium text-neutral-700 mb-1'}>
        Cidade
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={mostrar && ativa >= 0 ? `${listaId}-${ativa}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-erro` : undefined}
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAberta(true);
          setAtiva(-1);
        }}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onKeyDown={teclado}
        placeholder="Cidade de SP, ex.: Limeira"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="search"
        className={`w-full min-h-11 px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500 transition-colors ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300'
        }`}
      />
      <ul
        id={listaId}
        role="listbox"
        aria-label="Cidades de SP"
        hidden={!mostrar}
        className="absolute left-0 right-0 top-full mt-1 z-30 max-h-80 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
      >
        {sugestoes.map((nome, i) => (
          <li
            key={nome}
            id={`${listaId}-${i}`}
            role="option"
            aria-selected={i === ativa}
            // Mantém o foco no campo: sem isso o blur fecha a lista antes do toque contar
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => escolher(nome)}
            onMouseEnter={() => setAtiva(i)}
            className={`flex items-center min-h-11 md:min-h-9 px-3 text-sm cursor-pointer ${
              i === ativa ? 'bg-vr-50 text-vr-900' : 'text-neutral-700'
            }`}
          >
            {nome}
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {mostrar ? `${sugestoes.length} ${sugestoes.length === 1 ? 'cidade sugerida' : 'cidades sugeridas'}` : ''}
      </p>
      {error && (
        <p id={`${id}-erro`} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
