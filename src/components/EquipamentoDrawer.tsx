import { useQuery } from '@tanstack/react-query';
import { Drawer } from './Drawer';
import { UploadFoto } from './UploadFoto';
import { ListaFotos } from './ListaFotos';
import { AnaliseEquipamento } from './AnaliseEquipamento';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { levantamentosApi } from '../api/levantamentos';
import { funcaoLabel } from '../labels';
import { useIsAdmin } from '../stores/authStore';
import type { EquipamentoResponse } from '../types/api';

interface Props {
  equipamento: EquipamentoResponse | null;
  levantamentoId: number;
  onClose: () => void;
}

export function EquipamentoDrawer({ equipamento, levantamentoId, onClose }: Props) {
  const isAdmin = useIsAdmin();
  const { data: levantamento } = useQuery({
    queryKey: ['levantamento', levantamentoId],
    queryFn: () => levantamentosApi.buscar(levantamentoId),
    enabled: !!equipamento,
  });

  const { data: equipamentos } = useQuery({
    queryKey: ['equipamentos', levantamentoId],
    queryFn: () => levantamentosApi.listarEquipamentos(levantamentoId),
    enabled: !!equipamento,
  });

  const equipamentoAtualizado =
    equipamentos?.find((e) => e.id === equipamento?.id) ?? equipamento;

  const editavel =
    levantamento?.status === 'RASCUNHO' || levantamento?.status === 'EM_ANALISE';

  return (
    <Drawer
      open={!!equipamento}
      onClose={onClose}
      title={
        equipamentoAtualizado
          ? `${equipamentoAtualizado.categoria} ${equipamentoAtualizado.sequencia}`
          : ''
      }
    >
      {equipamentoAtualizado && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-neutral-500">Função</p>
            <p className="font-medium text-neutral-900">
              {funcaoLabel[equipamentoAtualizado.funcao]}
            </p>
          </div>

          <div>
            <p className="text-sm text-neutral-500 mb-2">Status</p>
            <StatusBadge status={equipamentoAtualizado.status} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-neutral-900">Adicionar foto</h3>
            </div>

            {editavel ? (
              <UploadFoto equipamentoId={equipamentoAtualizado.id} />
            ) : (
              <Card>
                <p className="text-sm text-neutral-500">
                  Levantamento não está editável. Não é possível enviar fotos.
                </p>
              </Card>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-neutral-900">Fotos enviadas</h3>
              <span className="text-xs text-neutral-500">
                {equipamentoAtualizado.qtdFotos} foto(s)
              </span>
            </div>
            <ListaFotos equipamentoId={equipamentoAtualizado.id} podeExcluir={isAdmin && editavel} />
          </div>

          <div>
            <h3 className="font-medium text-neutral-900 mb-3">Análise</h3>
            <AnaliseEquipamento
              equipamentoId={equipamentoAtualizado.id}
              temFoto={equipamentoAtualizado.qtdFotos > 0}
              editavel={editavel}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}