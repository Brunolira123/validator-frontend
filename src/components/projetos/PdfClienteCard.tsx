import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileDown, Info } from 'lucide-react';
import { mensagemErroBlob, planejamentosApi } from '../../api/projetos';
import { toast } from '../../stores/toastStore';
import { Card } from '../Card';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { Marcar } from './Campos';
import { invalidarPlanejamento } from './atividades';
import { normalizar, situacaoLabel } from '../../projetos';
import type { Planejamento } from '../../types/projetos';

/** "Mercado São José Ltda." → "mercado-sao-jose-ltda". */
const slug = (s: string) =>
  normalizar(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cliente';

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dá tempo do navegador começar o download antes de liberar
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * PDF do cronograma para o cliente (sem horas, custos nem nomes dos analistas). Exige cálculo em dia;
 * o editor pode marcar o planejamento como enviado na mesma ação.
 */
export function PdfClienteCard({ p, editor }: { p: Planejamento; editor: boolean }) {
  const qc = useQueryClient();
  const [marcarEnviado, setMarcarEnviado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O backend devolve 409 nesses casos: o botão já avisa antes
  const motivo = !p.calculo
    ? 'Calcule o cronograma antes de gerar o PDF.'
    : p.calculoDesatualizado
      ? 'O cálculo está desatualizado: recalcule antes de gerar o PDF.'
      : null;
  const jaEnviado = p.situacao === 'ENVIADO';
  // marcarEnviado só a partir de EM_PLANEJAMENTO (ENVIADO já está; o resto é 409)
  const podeMarcar = editor && p.situacao === 'EM_PLANEJAMENTO';
  const marcar = podeMarcar && marcarEnviado;

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    try {
      const pdf = await planejamentosApi.cronogramaPdf(p.id, marcar);
      baixar(pdf, `cronograma-${slug(p.clienteNome)}.pdf`);
      if (marcar) {
        setMarcarEnviado(false);
        invalidarPlanejamento(qc, p.id);
        toast(`PDF gerado. Situação: ${situacaoLabel.ENVIADO}`);
      } else {
        toast('PDF gerado');
      }
    } catch (e) {
      setErro(await mensagemErroBlob(e, 'Não foi possível gerar o PDF.'));
      // Um 409 pode vir de um cálculo que ficou velho em outra aba: recarrega para o aviso aparecer
      invalidarPlanejamento(qc, p.id);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-neutral-900">PDF para o cliente</h2>
          <p className="text-xs text-neutral-500">
            Etapas, quem faz e as datas. Horas, custos e nomes dos analistas não entram.
          </p>
          {editor && !motivo && (
            <div className="mt-1">
              {jaEnviado ? (
                <p className="text-sm text-green-700">Já está como enviado ao cliente.</p>
              ) : (
                <Marcar
                  checked={marcar}
                  onChange={setMarcarEnviado}
                  disabled={!podeMarcar || gerando}
                  dica={podeMarcar ? 'A situação passa para "Enviado ao cliente".' : `Só a partir de "${situacaoLabel.EM_PLANEJAMENTO}".`}
                >
                  Marcar como enviado ao cliente
                </Marcar>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch lg:items-end gap-1.5 shrink-0">
          <Button onClick={() => void gerar()} loading={gerando} disabled={!!motivo} title={motivo ?? undefined}>
            {!gerando && <FileDown size={16} aria-hidden="true" />}
            Gerar PDF para o cliente
          </Button>
          {motivo && (
            <p className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Info size={14} className="shrink-0" aria-hidden="true" />
              {motivo}
            </p>
          )}
        </div>
      </div>
      {/* Depois de um 409 por cálculo velho, o motivo ao lado do botão já explica */}
      {erro && !motivo && (
        <div className="mt-3">
          <ErrorAlert>{erro}</ErrorAlert>
        </div>
      )}
    </Card>
  );
}
