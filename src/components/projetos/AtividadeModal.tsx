import { useId, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { ErrorAlert } from '../ErrorAlert';
import { mensagemErro } from '../../api/erro';
import { achatar, descendentes, fmtHoras, normalizar, somar } from '../../projetos';
import type { Analista, Categoria, Contato } from '../../types/projetos';
import { arvoreDe, horasDoNo, selectCls, type AtividadeEditavel } from './atividades';
import { Campo, Marcar } from './Campos';

interface Props {
  inicial: AtividadeEditavel;
  novo: boolean;
  itens: AtividadeEditavel[];
  categorias: Categoria[];
  modo: 'planejamento' | 'template';
  analistas?: Analista[];
  contatos?: Contato[];
  somenteLeitura?: boolean;
  onSalvar: (valor: AtividadeEditavel) => Promise<void>;
  onClose: () => void;
}

/** "" → null; "4,5" → 4.5. */
const lerNumero = (s: string): number | null => {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function AtividadeModal({
  inicial,
  novo,
  itens,
  categorias,
  modo,
  analistas = [],
  contatos = [],
  somenteLeitura = false,
  onSalvar,
  onClose,
}: Props) {
  const ids = useId();
  const [v, setV] = useState<AtividadeEditavel>(inicial);
  const [horasTexto, setHorasTexto] = useState(inicial.horas == null ? '' : String(inicial.horas));
  const [divisao, setDivisao] = useState(
    (inicial.distribuicao ?? []).map((d) => ({ usuarioId: d.usuarioId, horas: String(d.horas) }))
  );
  const [buscaDep, setBuscaDep] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = <K extends keyof AtividadeEditavel>(campo: K, valor: AtividadeEditavel[K]) =>
    setV((atual) => ({ ...atual, [campo]: valor }));

  const arvore = arvoreDe(itens);
  const noAtual = achatar(arvore).find((n) => n.item.chave === inicial.chave);
  const resumo = !novo && !!noAtual && noAtual.filhos.length > 0;
  const somaFilhos = resumo && noAtual ? horasDoNo(noAtual, categorias) : 0;

  // Pai: nem ela, nem uma subtarefa dela. Dependência: nem ela, nem os ancestrais, nem as subtarefas (é ciclo)
  const proibidosPai = novo ? new Set<string>() : descendentes(arvore, inicial.chave, (a) => a.chave);
  const ancestrais = new Set<string>();
  for (let p = v.chavePai; p; p = itens.find((a) => a.chave === p)?.chavePai ?? null) {
    if (ancestrais.has(p)) break;
    ancestrais.add(p);
  }
  const ordenadas = achatar(arvore);
  const opcoesPai = ordenadas.filter((n) => !proibidosPai.has(n.item.chave) && !n.item.doCliente);
  const opcoesDep = ordenadas.filter(
    (n) => n.item.chave !== inicial.chave && !proibidosPai.has(n.item.chave) && !ancestrais.has(n.item.chave)
  );
  const termoDep = normalizar(buscaDep);
  const depsFiltradas = termoDep ? opcoesDep.filter((n) => normalizar(n.item.nome).includes(termoDep)) : opcoesDep;

  const categoriaAtual = categorias.find((c) => c.id === v.categoriaId);
  // Categoria inativa que a atividade já usa continua na lista
  const opcoesCategoria = categorias.filter((c) => c.ativo || c.id === v.categoriaId);

  const horasNum = lerNumero(horasTexto);
  const horasEfetivas = horasNum ?? categoriaAtual?.horasPadrao ?? 0;
  const divisaoNum = divisao.map((d) => ({ usuarioId: d.usuarioId, horas: lerNumero(d.horas) }));
  const somaDivisao = somar(divisaoNum.map((d) => d.horas ?? 0));
  const usaDivisao = modo === 'planejamento' && !resumo && !v.doCliente;

  const escolherCategoria = (id: number | null) => {
    set('categoriaId', id);
    const cat = categorias.find((c) => c.id === id);
    // Categoria preenche as horas. No template, vazio = segue a categoria quando for aplicado
    if (modo === 'planejamento') setHorasTexto(cat ? String(cat.horasPadrao) : '');
    else setHorasTexto('');
  };

  const validar = (): string | null => {
    if (!v.nome.trim()) return 'Informe o nome da atividade.';
    if (!resumo && !v.doCliente && horasNum !== null && (Number.isNaN(horasNum) || horasNum < 0))
      return 'Horas inválidas.';
    if (v.doCliente && (!Number.isInteger(v.diasCliente) || v.diasCliente < 1))
      return 'Dias do cliente: informe 1 ou mais.';
    if (usaDivisao && divisao.length > 0) {
      if (divisaoNum.some((d) => d.horas === null || Number.isNaN(d.horas) || d.horas <= 0))
        return 'Na divisão, informe horas maiores que zero para cada analista.';
      if (new Set(divisao.map((d) => d.usuarioId)).size !== divisao.length) return 'Analista repetido na divisão.';
      if (Math.abs(somaDivisao - horasEfetivas) > 0.001)
        return `A divisão soma ${fmtHoras(somaDivisao)}, mas a atividade tem ${fmtHoras(horasEfetivas)}.`;
    }
    return null;
  };

  const salvar = async () => {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await onSalvar({
        ...v,
        nome: v.nome.trim(),
        categoriaId: v.doCliente ? null : v.categoriaId,
        horas: resumo || v.doCliente ? (resumo ? v.horas : 0) : horasNum,
        responsavelId: v.doCliente ? null : (v.responsavelId ?? null),
        contatoClienteId: v.doCliente ? (v.contatoClienteId ?? null) : null,
        distribuicao: usaDivisao ? divisaoNum.map((d) => ({ usuarioId: d.usuarioId, horas: d.horas ?? 0 })) : [],
      });
      onClose();
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível salvar a atividade.'));
    } finally {
      setSalvando(false);
    }
  };

  const ro = somenteLeitura;
  const livresParaDivisao = analistas.filter((a) => !divisao.some((d) => d.usuarioId === a.id));

  return (
    <Modal title={novo ? 'Nova atividade' : somenteLeitura ? 'Atividade' : 'Editar atividade'} onClose={onClose} size="2xl">
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ro) void salvar();
        }}
      >
        <Input label="Nome" value={v.nome} onChange={(e) => set('nome', e.target.value)} disabled={ro} autoFocus={novo} maxLength={200} />

        <Campo rotulo="Dentro de (atividade principal)" htmlFor={`${ids}-pai`}>
          <select
            id={`${ids}-pai`}
            className={selectCls}
            value={v.chavePai ?? ''}
            disabled={ro}
            onChange={(e) => set('chavePai', e.target.value || null)}
          >
            <option value="">Nenhuma (atividade principal)</option>
            {opcoesPai.map((n) => (
              <option key={n.item.chave} value={n.item.chave}>
                {'  '.repeat(n.nivel)}
                {n.nivel > 0 ? '↳ ' : ''}
                {n.item.nome}
              </option>
            ))}
          </select>
        </Campo>

        {resumo ? (
          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-sm text-neutral-700">
            <strong>Resumo:</strong> soma dos filhos, <span className="tabular-nums font-semibold">Σ {fmtHoras(somaFilhos)}</span>.
            As horas, o responsável e a divisão ficam nas subtarefas.
          </div>
        ) : (
          <Marcar
            checked={v.doCliente}
            onChange={(c) => set('doCliente', c)}
            disabled={ro}
            dica="Não usa analista: ocupa dias úteis seguidos, sem horas."
          >
            Atividade do cliente
          </Marcar>
        )}

        {!resumo && v.doCliente && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Dias úteis do cliente"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={v.diasCliente}
              disabled={ro}
              onChange={(e) => set('diasCliente', Math.trunc(Number(e.target.value)))}
            />
            {modo === 'planejamento' && (
              <Campo rotulo="Contato do cliente" htmlFor={`${ids}-contato`} dica={contatos.length === 0 ? 'Cadastre os contatos na aba Contatos.' : undefined}>
                <select
                  id={`${ids}-contato`}
                  className={selectCls}
                  value={v.contatoClienteId ?? ''}
                  disabled={ro}
                  onChange={(e) => set('contatoClienteId', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Sem contato</option>
                  {contatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                      {c.setor ? ` (${c.setor})` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
        )}

        {!resumo && !v.doCliente && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo rotulo="Categoria" htmlFor={`${ids}-cat`} dica="Preenche as horas com o padrão da categoria.">
                <select
                  id={`${ids}-cat`}
                  className={selectCls}
                  value={v.categoriaId ?? ''}
                  disabled={ro}
                  onChange={(e) => escolherCategoria(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Sem categoria</option>
                  {opcoesCategoria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({fmtHoras(c.horasPadrao)}){c.ativo ? '' : ' · inativa'}
                    </option>
                  ))}
                </select>
              </Campo>
              <Input
                label="Horas"
                inputMode="decimal"
                value={horasTexto}
                disabled={ro}
                placeholder={categoriaAtual ? `${categoriaAtual.horasPadrao} (padrão)` : '0'}
                hint={
                  modo === 'template' && horasNum === null && categoriaAtual
                    ? 'Vazio: segue as horas padrão da categoria ao aplicar.'
                    : undefined
                }
                onChange={(e) => setHorasTexto(e.target.value)}
              />
            </div>

            {modo === 'planejamento' && (
              <Campo rotulo="Responsável" htmlFor={`${ids}-resp`}>
                <select
                  id={`${ids}-resp`}
                  className={selectCls}
                  value={v.responsavelId ?? ''}
                  disabled={ro}
                  onChange={(e) => set('responsavelId', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Sem responsável</option>
                  {analistas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            {usaDivisao && (
              <fieldset className="rounded-lg border border-neutral-200 p-3">
                <legend className="px-1 text-sm font-medium text-neutral-700">Divisão por analista</legend>
                <p className="text-xs text-neutral-500 mb-2">
                  Vazia: todas as horas vão para o responsável. Com analistas, a soma tem que bater com as horas.
                </p>
                <ul className="space-y-2">
                  {divisao.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <select
                        aria-label="Analista"
                        className={`${selectCls} flex-1 min-w-0`}
                        value={d.usuarioId}
                        disabled={ro}
                        onChange={(e) =>
                          setDivisao((atual) => atual.map((x, j) => (j === i ? { ...x, usuarioId: Number(e.target.value) } : x)))
                        }
                      >
                        {analistas
                          .filter((a) => a.id === d.usuarioId || !divisao.some((x) => x.usuarioId === a.id))
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nome}
                            </option>
                          ))}
                      </select>
                      <input
                        aria-label="Horas do analista"
                        inputMode="decimal"
                        className="w-20 min-h-11 px-3 py-2 border border-neutral-300 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-vr-500"
                        value={d.horas}
                        disabled={ro}
                        onChange={(e) =>
                          setDivisao((atual) => atual.map((x, j) => (j === i ? { ...x, horas: e.target.value } : x)))
                        }
                      />
                      {!ro && (
                        <button
                          type="button"
                          aria-label="Remover analista"
                          onClick={() => setDivisao((atual) => atual.filter((_, j) => j !== i))}
                          className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {!ro && livresParaDivisao.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const restante = Math.max(0, somar([horasEfetivas, -somaDivisao]));
                        // Começa pelo responsável, se ele ainda não está na divisão
                        const prox =
                          livresParaDivisao.find((a) => a.id === v.responsavelId) ?? livresParaDivisao[0];
                        setDivisao((atual) => [...atual, { usuarioId: prox.id, horas: restante ? String(restante) : '' }]);
                      }}
                      className="inline-flex items-center gap-1 min-h-11 md:min-h-9 px-2 -ml-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50"
                    >
                      <Plus size={16} /> Analista
                    </button>
                  ) : (
                    <span />
                  )}
                  {divisao.length > 0 && (
                    <span
                      className={`text-sm tabular-nums font-medium ${
                        Math.abs(somaDivisao - horasEfetivas) > 0.001 ? 'text-red-600' : 'text-green-700'
                      }`}
                    >
                      {fmtHoras(somaDivisao)} de {fmtHoras(horasEfetivas)}
                    </span>
                  )}
                </div>
              </fieldset>
            )}

            <Marcar
              checked={v.indivisivel}
              onChange={(c) => set('indivisivel', c)}
              disabled={ro}
              dica="Não quebra o esforço de um analista em dias diferentes (máx. 8h por analista)."
            >
              Indivisível
            </Marcar>
          </>
        )}

        <fieldset>
          <legend className="block text-sm font-medium text-neutral-700 mb-1">
            Depende de {v.dependeDe.length > 0 && <span className="text-neutral-500 font-normal">({v.dependeDe.length})</span>}
          </legend>
          {opcoesDep.length === 0 ? (
            <p className="text-sm text-neutral-500">Não há outras atividades.</p>
          ) : (
            <>
              {opcoesDep.length > 6 && (
                <div className="relative mb-2">
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    aria-label="Buscar atividade"
                    placeholder="Buscar atividade"
                    value={buscaDep}
                    onChange={(e) => setBuscaDep(e.target.value)}
                    className="w-full min-h-11 pl-9 pr-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vr-500"
                  />
                </div>
              )}
              <ul className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                {depsFiltradas.map((n) => {
                  const marcada = v.dependeDe.includes(n.item.chave);
                  return (
                    <li key={n.item.chave}>
                      <label className="flex items-center gap-3 min-h-11 px-3 cursor-pointer hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          checked={marcada}
                          disabled={ro}
                          onChange={() =>
                            set(
                              'dependeDe',
                              marcada ? v.dependeDe.filter((c) => c !== n.item.chave) : [...v.dependeDe, n.item.chave]
                            )
                          }
                          className="h-5 w-5 shrink-0 rounded border-neutral-300 text-vr-600 focus:ring-vr-500"
                        />
                        <span className="text-sm text-neutral-800" style={{ paddingLeft: `${n.nivel * 0.75}rem` }}>
                          {n.item.nome}
                        </span>
                      </label>
                    </li>
                  );
                })}
                {depsFiltradas.length === 0 && <li className="px-3 py-3 text-sm text-neutral-500">Nada encontrado.</li>}
              </ul>
              <p className="text-xs text-neutral-500 mt-1">
                Começa no dia útil seguinte ao término das marcadas. As dependências da atividade principal valem para as subtarefas.
              </p>
            </>
          )}
        </fieldset>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
            {ro ? 'Fechar' : 'Cancelar'}
          </Button>
          {!ro && (
            <Button type="submit" loading={salvando}>
              {novo ? 'Adicionar' : 'Salvar'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
