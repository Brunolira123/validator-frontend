import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Clientes from './pages/Clientes';
import Prospeccao from './pages/Prospeccao';
import Levantamentos from './pages/Levantamentos';
import Relatorios from './pages/Relatorios';
import Monitoramento from './pages/Monitoramento';
import MonitoramentoCliente from './pages/MonitoramentoCliente';
import Usuarios from './pages/Usuarios';
import SuporteClientes from './pages/SuporteClientes';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import ClienteDetalhe from './pages/ClienteDetalhe';
import LevantamentoDetalhe from './pages/LevantamentoDetalhe';
import { RedirecionarComId } from './components/RedirecionarComId';
import { modulo } from './modulos';
import Planejamentos from './pages/projetos/Planejamentos';
import PlanejamentoDetalhe from './pages/projetos/PlanejamentoDetalhe';
import Templates from './pages/projetos/Templates';
import TemplateEditor from './pages/projetos/TemplateEditor';
import Categorias from './pages/projetos/Categorias';
import Feriados from './pages/projetos/Feriados';
import { perfisEditores } from './projetos';

const comercial = modulo('comercial');
const monitoramento = modulo('monitoramento');
const suporte = modulo('suporte');
const projetos = modulo('projetos');

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Inicio /> },
      {
        path: 'comercial',
        element: <ProtectedRoute perfis={comercial.perfis} />,
        children: [
          { index: true, element: <Navigate to="clientes" replace /> },
          { path: 'clientes', element: <Clientes /> },
          { path: 'clientes/:id', element: <ClienteDetalhe /> },
          { path: 'prospeccao', element: <Prospeccao /> },
          { path: 'levantamentos', element: <Levantamentos /> },
          { path: 'levantamentos/:id', element: <LevantamentoDetalhe /> },
          { path: 'relatorios', element: <Relatorios /> },
        ],
      },
      {
        path: 'monitoramento',
        element: <ProtectedRoute perfis={monitoramento.perfis} />,
        children: [
          { index: true, element: <Monitoramento /> },
          { path: 'clientes/:id', element: <MonitoramentoCliente /> },
        ],
      },
      {
        path: 'suporte',
        element: <ProtectedRoute perfis={suporte.perfis} />,
        children: [
          { index: true, element: <Navigate to="clientes" replace /> },
          { path: 'clientes', element: <SuporteClientes /> },
        ],
      },
      {
        path: 'projetos',
        element: <ProtectedRoute perfis={projetos.perfis} />,
        children: [
          { index: true, element: <Navigate to="planejamentos" replace /> },
          { path: 'planejamentos', element: <Planejamentos /> },
          { path: 'planejamentos/:id', element: <PlanejamentoDetalhe /> },
          {
            // Cadastros: o COMERCIAL só lê planejamentos (o backend responde 403)
            element: <ProtectedRoute perfis={perfisEditores} />,
            children: [
              { path: 'templates', element: <Templates /> },
              { path: 'templates/:id', element: <TemplateEditor /> },
              { path: 'categorias', element: <Categorias /> },
              { path: 'feriados', element: <Feriados /> },
            ],
          },
        ],
      },

      {
        // Administração: fora dos módulos, só ADMIN e DIRETORIA (o backend também barra)
        path: 'usuarios',
        element: <ProtectedRoute perfis={['ADMIN', 'DIRETORIA']} />,
        children: [{ index: true, element: <Usuarios /> }],
      },

      // Rotas antigas (antes do portal)
      { path: 'clientes', element: <Navigate to="/comercial/clientes" replace /> },
      { path: 'clientes/:id', element: <RedirecionarComId para="/comercial/clientes" /> },
      { path: 'levantamentos', element: <Navigate to="/comercial/levantamentos" replace /> },
      { path: 'levantamentos/:id', element: <RedirecionarComId para="/comercial/levantamentos" /> },
      { path: 'relatorios', element: <Navigate to="/comercial/relatorios" replace /> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
