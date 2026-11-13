import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Power, PowerOff } from 'lucide-react';
import { monitorApi } from '../../api/monitor';
import { mensagemErro } from '../../api/erro';
import { Button } from '../Button';
import { Card } from '../Card';
import { ErrorAlert } from '../ErrorAlert';
import { Modal } from '../Modal';
import { TokenAgenteModal } from '../TokenAgenteModal';
import { AgenteVersaoBloco } from '../AgenteVersaoBloco';
import { DesativarClienteModal } from './DesativarClienteModal';
import { textoDesativacao } from './textos';
import { toast } from '../../stores/toastStore';
import type { ClienteListaResponse, SuporteClienteResponse, TokenAgenteResponse } from '../../types/api';

interface Props {
  cliente: ClienteListaResponse;
  /** Item da lista do Suporte (versão alvo, updater, última atualização). undefined se desativado. */
  suporte: SuporteClienteResponse | undefined;
}

/** ADMIN/DIRETORIA: versão do agente, token e desativar/reativar (o backend também barra). */
export function AbaAgente({ cliente, suporte }: Props) {
  const queryClient = useQueryClient();
  const [confirmarToken, setConfirmarToken] = useState(false);
  const [desativarAberto, setDesativarAberto] = useState(false);
  const [token, setToken] = useState<{ resultado: TokenAgenteResponse; titulo: string } | null>(null);

  const gerarToken = useMutation({
    mutationFn: () => monitorApi.gerarNovoToken(cliente.id),
    onSuccess: (resultado) => {
      setConfirmarToken(false);
      setToken({ resultado, titulo: `Token novo: ${cliente.nome}` });
    },
  });

  const reativar = useMutation({
    mutationFn: () => monitorApi.reativar(cliente.id),
    onSuccess: (resultado) => {
      toast(`${cliente.nome} reativado.`);
      setToken({ resultado, titulo: `${cliente.nome} reativado` });
      queryClient.invalidateQueries({ queryKey: ['monitor'] });
    },
  });

  if (!cliente.ativo) {
    return (
      <>
        <Card>
          <h3 className="text-base font-semibold text-neutral-900">Cliente desativado</h3>
          <p className="mt-2 text-sm text-neutral-600 break-words">
            {textoDesativacao(cliente)}
            {cliente.desativacao?.motivo && <> · {cliente.desativacao.motivo}</>}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Reativar gera um token novo, que aparece uma única vez. O token anterior à desativação continua recusado.
          </p>
          {reativar.error && (
            <div className="mt-3">
              <ErrorAlert>{mensagemErro(reativar.error, 'Erro ao reativar o cliente')}</ErrorAlert>
            </div>
          )}
          <Button className="mt-4 w-full sm:w-auto" onClick={() => reativar.mutate()} loading={reativar.isPending}>
            {!reativar.isPending && <Power size={16} aria-hidden="true" />}
            Reativar
          </Button>
        </Card>
        {token && <TokenAgenteModal resultado={token.resultado} titulo={token.titulo} troca onClose={() => setToken(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        {suporte ? <AgenteVersaoBloco cliente={suporte} /> : <p className="text-sm text-neutral-500">Carregando...</p>}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-neutral-900">Token do agente</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Gere outro se o token vazou ou se perdeu. O atual para de funcionar na hora.
        </p>
        <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => setConfirmarToken(true)}>
          <KeyRound size={16} aria-hidden="true" />
          Gerar novo token
        </Button>
      </Card>

      <Card className="border-red-200">
        <h3 className="text-base font-semibold text-neutral-900">Desativar cliente</h3>
        <p className="mt-1 text-sm text-neutral-600">
          O agente deixa de ser aceito e o cliente sai das listas. O histórico é mantido e dá para reativar depois.
        </p>
        <Button variant="danger" className="mt-3 w-full sm:w-auto" onClick={() => setDesativarAberto(true)}>
          <PowerOff size={16} aria-hidden="true" />
          Desativar
        </Button>
      </Card>

      {confirmarToken && (
        <Modal title="Gerar novo token?" onClose={() => setConfirmarToken(false)}>
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-neutral-700">
              O token atual de <strong>{cliente.nome}</strong> para de funcionar na hora. O agente só volta a
              reportar depois que o novo token for colocado no{' '}
              <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">vr.properties</code> do cliente.
            </p>
            {gerarToken.error && <ErrorAlert>{mensagemErro(gerarToken.error, 'Erro ao gerar token')}</ErrorAlert>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmarToken(false)}>
                Cancelar
              </Button>
              <Button variant="danger" loading={gerarToken.isPending} onClick={() => gerarToken.mutate()}>
                Gerar novo token
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {desativarAberto && (
        <DesativarClienteModal clienteId={cliente.id} nome={cliente.nome} onClose={() => setDesativarAberto(false)} />
      )}

      {token && <TokenAgenteModal resultado={token.resultado} titulo={token.titulo} troca onClose={() => setToken(null)} />}
    </div>
  );
}
