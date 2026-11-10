import { useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calculator, CalendarRange } from 'lucide-react';
import { cadastrosApi } from '../../api/projetos';
import { Card } from '../Card';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { arvoreDe } from './atividades';
import { PdfClienteCard } from './PdfClienteCard';
import { achatar, diasDaSemana, feriadosQueValem, fmtHoras, fmtMoeda, iniciais, nomeDiaSemana, paraData, somar, instante } from '../../projetos';
import { formatarDataHora, formatarDiaMes, tempoDesde } from '../../labels';
import type { Alocacao, Calculo, LinhaCalculo, Planejamento } from '../../types/projetos';

interface Props {
  p: Planejamento;
  editavel: boolean;
  editor: boolean;
  erros: string[] | null;
  calculando: boolean;
  onCalcular: () => void;
}

function Kpi({ rotulo, valor, extra }: { rotulo: string; valor: string; extra?: ReactNode }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="mt-1 text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums">{valor}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </Card>
  );
}

/** "BR 12h · CA 4h": horas por analista dentro da atividade. */
function porAnalista(alocs: Alocacao[]) {
  const mapa = new Map<number, { nome: string; horas: number }>();
  alocs.forEach((a) => {
    const atual = mapa.get(a.usuarioId) ?? { nome: a.usuarioNome, horas: 0 };
    mapa.set(a.usuarioId, { nome: a.usuarioNome, horas: somar([atual.horas, a.horas]) });
  });
  return [...mapa.values()];
}

/** Uma linha por dia: "seg 23/11: Bruno 4h, Carla 2h". */
function alocacaoPorDia(alocs: Alocacao[]) {
  const dias = new Map<string, Alocacao[]>();
  alocs.forEach((a) => dias.set(a.data, [...(dias.get(a.data) ?? []), a]));
  return [...dias.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, lista]) => ({ data, pessoas: porAnalista(lista) }));
}

interface LinhaGantt {
  chave: string;
  nome: string;
  nivel: number;
  linha?: LinhaCalculo;
  alocs: Alocacao[];
  tipo: 'equipe' | 'cliente' | 'resumo' | 'viagem';
  contato?: string | null;
}

function Gantt({ p, calc, feriados }: { p: Planejamento; calc: Calculo; feriados: Map<string, string> }) {
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const inicio = calc.kickoff < calc.inicio ? calc.kickoff : calc.inicio;
  const dias = diasDaSemana(inicio, calc.termino);
  const indice = new Map(dias.map((d, i) => [d, i]));

  const linhasPorId = new Map(calc.atividades.map((l) => [l.atividadeId, l]));
  const alocsPorAtividade = new Map<number, Alocacao[]>();
  calc.alocacoes.forEach((a) => {
    if (a.tipo === 'SERVICO' && a.atividadeId != null)
      alocsPorAtividade.set(a.atividadeId, [...(alocsPorAtividade.get(a.atividadeId) ?? []), a]);
  });

  // Ordem da árvore atual; o que saiu do planejamento depois do cálculo vai para o fim
  const arvore = achatar(
    arvoreDe(
      p.atividades.map((a) => ({
        chave: String(a.id),
        chavePai: a.paiId == null ? null : String(a.paiId),
        nome: a.nome,
        categoriaId: a.categoriaId,
        horas: a.horas,
        dependeDe: [],
        indivisivel: a.indivisivel,
        doCliente: a.doCliente,
        diasCliente: a.diasCliente,
        ordem: a.ordem,
      }))
    )
  );
  const vistas = new Set<number>();
  const linhas: LinhaGantt[] = arvore.map((n) => {
    const id = Number(n.item.chave);
    vistas.add(id);
    const linha = linhasPorId.get(id);
    const atividade = p.atividades.find((a) => a.id === id);
    return {
      chave: n.item.chave,
      nome: n.item.nome,
      nivel: n.nivel,
      linha,
      alocs: alocsPorAtividade.get(id) ?? [],
      tipo: linha?.resumo || n.filhos.length > 0 ? 'resumo' : (linha?.doCliente ?? n.item.doCliente) ? 'cliente' : 'equipe',
      contato: atividade?.contatoClienteNome,
    };
  });
  calc.atividades
    .filter((l) => !vistas.has(l.atividadeId))
    .forEach((l) =>
      linhas.push({
        chave: String(l.atividadeId),
        nome: l.nome,
        nivel: 0,
        linha: l,
        alocs: alocsPorAtividade.get(l.atividadeId) ?? [],
        tipo: l.resumo ? 'resumo' : l.doCliente ? 'cliente' : 'equipe',
      })
    );
  const viagens = calc.alocacoes.filter((a) => a.tipo === 'VIAGEM');
  if (viagens.length > 0) linhas.push({ chave: 'viagem', nome: 'Deslocamentos', nivel: 0, alocs: viagens, tipo: 'viagem' });

  const colunas: CSSProperties = { gridTemplateColumns: `var(--col-nome) repeat(${dias.length}, minmax(2.75rem, 1fr))` };
  const totalLinhas = linhas.length;
  const detalhe = linhas.find((l) => l.chave === selecionada);

  const dicaDe = (l: LinhaGantt) => {
    const cab = l.linha?.inicio && l.linha.fim ? `${l.nome}: ${formatarDiaMes(l.linha.inicio)} a ${formatarDiaMes(l.linha.fim)}` : l.nome;
    if (l.tipo === 'cliente') return `${cab}\nCliente${l.contato ? ` (${l.contato})` : ''}`;
    const porDia = alocacaoPorDia(l.alocs).map(
      (d) => `${nomeDiaSemana(d.data)} ${formatarDiaMes(d.data)}: ${d.pessoas.map((x) => `${x.nome} ${fmtHoras(x.horas)}`).join(', ')}`
    );
    return [cab, ...porDia].join('\n');
  };

  const barra = (l: LinhaGantt, linhaGrid: number) => {
    if (l.tipo === 'viagem') {
      // Viagem: um marcador por dia com alocação
      return alocacaoPorDia(l.alocs).map((d) => {
        const i = indice.get(d.data);
        if (i == null) return null;
        return (
          <button
            key={d.data}
            type="button"
            title={dicaDe(l)}
            onClick={() => setSelecionada(l.chave)}
            style={{ gridColumn: `${i + 2} / span 1`, gridRow: linhaGrid }}
            className="z-[2] self-center mx-0.5 h-5 rounded bg-neutral-300 text-[10px] font-semibold text-neutral-700 truncate px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
          >
            {fmtHoras(somar(d.pessoas.map((x) => x.horas)))}
          </button>
        );
      });
    }
    if (!l.linha?.inicio || !l.linha.fim) return null;
    const i = indice.get(l.linha.inicio);
    const j = indice.get(l.linha.fim);
    if (i == null || j == null) return null;
    const rotulo =
      l.tipo === 'cliente'
        ? (l.contato ?? 'Cliente')
        : l.tipo === 'equipe'
          ? porAnalista(l.alocs)
              .map((x) => `${iniciais(x.nome)} ${fmtHoras(x.horas)}`)
              .join(' · ')
          : '';
    const estilo =
      l.tipo === 'resumo'
        ? 'h-2.5 bg-neutral-300 border border-neutral-400/60'
        : l.tipo === 'cliente'
          ? 'h-6 bg-blue-100 border border-blue-400 text-blue-800'
          : 'h-6 bg-vr-200 border border-vr-500 text-vr-900';
    return (
      <button
        type="button"
        title={dicaDe(l)}
        aria-label={dicaDe(l).replace(/\n/g, '; ')}
        onClick={() => setSelecionada(selecionada === l.chave ? null : l.chave)}
        onMouseEnter={() => setSelecionada(l.chave)}
        style={{ gridColumn: `${i + 2} / ${j + 3}`, gridRow: linhaGrid }}
        className={`z-[2] self-center mx-0.5 rounded-md px-1.5 text-left text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-600 ${estilo} ${
          selecionada === l.chave ? 'ring-2 ring-neutral-900/70' : ''
        }`}
      >
        {rotulo}
      </button>
    );
  };

  return (
    <Card className="!p-0 min-w-0 overflow-hidden">
      {/* Rolagem horizontal só do Gantt, nunca da página */}
      <div className="overflow-x-auto overscroll-x-contain [--col-nome:8.5rem] sm:[--col-nome:14rem]">
        <div className="grid w-max min-w-full" style={colunas} onMouseLeave={() => setSelecionada(null)}>
          {/* Cabeçalho */}
          <div className="sticky left-0 z-[4] bg-white border-b border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500" style={{ gridRow: 1, gridColumn: 1 }}>
            Atividade
          </div>
          {dias.map((d, i) => {
            const segunda = paraData(d).getUTCDay() === 1;
            const feriado = feriados.get(d);
            return (
              <div
                key={d}
                title={feriado}
                style={{ gridRow: 1, gridColumn: i + 2 }}
                className={`border-b border-neutral-200 py-2 text-center text-[11px] leading-tight tabular-nums ${
                  segunda && i > 0 ? 'border-l border-l-neutral-200' : ''
                } ${feriado ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}
              >
                {d.slice(8, 10)}
                {d.slice(8, 10) === '01' || i === 0 ? <span className="block text-[10px] text-neutral-400">/{d.slice(5, 7)}</span> : null}
                <span className="block text-[10px] text-neutral-400">{feriado ? 'F' : nomeDiaSemana(d).slice(0, 3)}</span>
              </div>
            );
          })}

          {/* Fundo: feriados e semanas */}
          {dias.map((d, i) =>
            feriados.has(d) ? (
              <div
                key={`f-${d}`}
                aria-hidden="true"
                style={{ gridColumn: i + 2, gridRow: `2 / span ${totalLinhas}` }}
                className="z-0 bg-[repeating-linear-gradient(135deg,theme(colors.neutral.100)_0,theme(colors.neutral.100)_4px,theme(colors.neutral.50)_4px,theme(colors.neutral.50)_8px)]"
              />
            ) : paraData(d).getUTCDay() === 1 && i > 0 ? (
              <div key={`s-${d}`} aria-hidden="true" style={{ gridColumn: i + 2, gridRow: `2 / span ${totalLinhas}` }} className="z-0 border-l border-neutral-100" />
            ) : null
          )}

          {/* Linhas */}
          {linhas.map((l, r) => {
            const linhaGrid = r + 2;
            return (
              <div key={l.chave} className="contents">
                <div
                  style={{ gridRow: linhaGrid, gridColumn: 1, paddingLeft: `${0.75 + Math.min(l.nivel, 5) * 0.75}rem` }}
                  className={`sticky left-0 z-[3] bg-white border-b border-neutral-100 pr-2 py-2 text-xs sm:text-sm truncate ${
                    l.tipo === 'resumo' ? 'font-semibold text-neutral-900' : l.tipo === 'viagem' ? 'italic text-neutral-500' : 'text-neutral-700'
                  }`}
                  title={l.nome}
                >
                  {l.nome}
                  {l.tipo === 'cliente' && (
                    <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">cliente</span>
                  )}
                </div>
                <div aria-hidden="true" style={{ gridRow: linhaGrid, gridColumn: `2 / span ${dias.length}` }} className="z-[1] border-b border-neutral-100" />
                {barra(l, linhaGrid)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-neutral-100 px-4 py-3 text-sm min-h-[3.5rem]" aria-live="polite">
        {detalhe ? (
          <div>
            <p className="font-medium text-neutral-900">
              {detalhe.nome}
              {detalhe.linha?.inicio && detalhe.linha.fim && (
                <span className="font-normal text-neutral-500">
                  {' '}
                  · {formatarDiaMes(detalhe.linha.inicio)} a {formatarDiaMes(detalhe.linha.fim)}
                  {detalhe.tipo !== 'cliente' && ` · ${fmtHoras(detalhe.linha.horas)}`}
                </span>
              )}
            </p>
            {detalhe.tipo === 'cliente' ? (
              <p className="text-neutral-600">Com o cliente{detalhe.contato ? ` (${detalhe.contato})` : ''}, sem horas da equipe.</p>
            ) : detalhe.tipo === 'resumo' ? (
              <p className="text-neutral-600">Resumo: vai do início da primeira subtarefa ao fim da última.</p>
            ) : (
              <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 text-neutral-600">
                {alocacaoPorDia(detalhe.alocs).map((d) => (
                  <li key={d.data} className="tabular-nums">
                    <span className="text-neutral-500">
                      {nomeDiaSemana(d.data)} {formatarDiaMes(d.data)}:
                    </span>{' '}
                    {d.pessoas.map((x) => `${x.nome} ${fmtHoras(x.horas)}`).join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            Laranja = equipe · azul = cliente · cinza = resumo · coluna “F” = feriado. Passe o mouse ou toque numa barra para ver a
            alocação por dia.
          </p>
        )}
      </div>
    </Card>
  );
}

export function AbaCronograma({ p, editavel, editor, erros, calculando, onCalcular }: Props) {
  const calc = p.calculo;
  const { data: cadastro } = useQuery({
    queryKey: ['projetos', 'feriados', 'todos'],
    queryFn: () => cadastrosApi.feriados(),
    enabled: editor,
  });
  const feriados = new Map(feriadosQueValem(cadastro ?? [], p.feriadosExtras, p).map((f) => [f.data, f.descricao]));

  const errosBloco = erros && (
    <ErrorAlert>
      <p className="font-semibold">O cronograma não pôde ser calculado. Corrija e calcule de novo:</p>
      <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
        {erros.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </ErrorAlert>
  );

  if (!calc) {
    return (
      <div className="space-y-4">
        {errosBloco}
        <PdfClienteCard p={p} editor={editor} />
        <Card className="text-center py-12">
          <CalendarRange size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
          <p className="mt-3 font-medium text-neutral-800">Cronograma ainda não calculado</p>
          <p className="mt-1 text-sm text-neutral-500">
            {p.kickoff ? `O cálculo começa no kickoff (${formatarDiaMes(p.kickoff)}).` : 'Informe o kickoff na aba Dados antes de calcular.'}
          </p>
          {editavel && (
            <div className="mt-4">
              <Button onClick={onCalcular} loading={calculando}>
                {!calculando && <Calculator size={16} aria-hidden="true" />} Calcular cronograma
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const saldo = calc.saldoContrato;
  const contrato =
    calc.horasContratadas == null ? (
      <span className="text-xs text-neutral-500">sem horas contratadas</span>
    ) : saldo === 0 ? (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">= contrato</span>
    ) : saldo != null && saldo < 0 ? (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        +{fmtHoras(-saldo)} acima de {fmtHoras(calc.horasContratadas)}
      </span>
    ) : (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
        saldo {fmtHoras(saldo)} de {fmtHoras(calc.horasContratadas)}
      </span>
    );
  const feriadosNoPeriodo = [...feriados.keys()].filter((d) => d >= calc.kickoff && d <= calc.termino).sort();

  return (
    <div className="space-y-4 min-w-0">
      {errosBloco}

      {p.calculoDesatualizado && (
        <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          <p className="flex-1">
            <strong>Cálculo desatualizado.</strong> O planejamento foi editado depois do último cálculo (
            {formatarDataHora(instante(calc.calculadoEm))}). As datas abaixo podem não valer mais.
          </p>
          {editavel && (
            <Button size="sm" onClick={onCalcular} loading={calculando}>
              Recalcular
            </Button>
          )}
        </div>
      )}

      <PdfClienteCard p={p} editor={editor} />

      <p className="text-sm text-neutral-500">
        Calculado {tempoDesde(instante(calc.calculadoEm))} · 8h por analista/dia · seg a sex
        {feriadosNoPeriodo.length > 0 && ` · feriado(s) ${feriadosNoPeriodo.map(formatarDiaMes).join(', ')} considerado(s)`}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi rotulo="Início" valor={formatarDiaMes(calc.inicio)} />
        <Kpi rotulo="Término" valor={formatarDiaMes(calc.termino)} />
        <Kpi rotulo="Dias úteis" valor={String(calc.diasUteis)} />
        <Kpi
          rotulo="Horas de serviço"
          valor={fmtHoras(calc.horasServico)}
          extra={
            <div className="flex flex-wrap gap-1 items-center">
              {contrato}
              {calc.horasViagem > 0 && <span className="text-xs text-neutral-500">+ {fmtHoras(calc.horasViagem)} viagem</span>}
            </div>
          }
        />
        <div className="col-span-2 lg:col-span-1">
          <Kpi rotulo="Custo interno" valor={fmtMoeda(calc.custoInterno)} />
        </div>
      </div>

      <Gantt p={p} calc={calc} feriados={feriados} />

      <Card>
        <h2 className="font-semibold text-neutral-900">Conflitos com outros projetos</h2>
        {calc.conflitos.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nenhum: nos dias usados, ninguém tinha horas em outros projetos.</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-neutral-500">
              Horas que o analista já tinha em outros planejamentos, por semana. O cálculo já descontou essa carga.
            </p>
            <ul className="mt-2 divide-y divide-neutral-100">
              {calc.conflitos.map((c) => (
                <li key={`${c.usuarioId}-${c.semana}`} className="flex items-start gap-2 py-2 text-sm text-neutral-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="flex-1">{c.mensagem}</span>
                  <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap">sem. {formatarDiaMes(c.semana)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
