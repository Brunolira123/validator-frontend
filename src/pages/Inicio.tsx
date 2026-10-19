import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuthStore } from '../stores/authStore';
import { modulosDoPerfil } from '../modulos';
import { DashboardMonitoramento } from '../components/DashboardMonitoramento';

export default function Inicio() {
  const usuario = useAuthStore((s) => s.usuario);
  const navigate = useNavigate();
  const disponiveis = modulosDoPerfil(usuario?.perfil);
  const veMonitoramento = disponiveis.some((m) => m.id === 'monitoramento');
  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          {primeiroNome ? `Olá, ${primeiroNome}` : 'Portal VRIP'}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Escolha um módulo para começar</p>
      </div>

      {disponiveis.length === 0 && (
        <Card>
          <p className="text-center text-neutral-500 py-8">
            Seu perfil ainda não tem módulos liberados. Fale com um administrador.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {disponiveis.map(({ id, label, descricao, icone: Icone, rota }) => (
          <Card key={id} interativo onClick={() => navigate(rota)}>
            <div className="flex items-center gap-4">
              <div className="bg-vr-50 p-3 rounded-lg shrink-0">
                <Icone size={22} className="text-vr-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900">{label}</p>
                <p className="text-sm text-neutral-500 truncate">{descricao}</p>
              </div>
              <ChevronRight size={18} className="text-neutral-300 shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {veMonitoramento && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">Painel</h2>
          <DashboardMonitoramento />
        </div>
      )}
    </div>
  );
}
