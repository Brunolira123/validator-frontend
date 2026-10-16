import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Clientes from './pages/Clientes';
import Levantamentos from './pages/Levantamentos';
import Relatorios from './pages/Relatorios';
import Monitoramento from './pages/Monitoramento';
import MonitoramentoCliente from './pages/MonitoramentoCliente';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import ClienteDetalhe from './pages/ClienteDetalhe';
import LevantamentoDetalhe from './pages/LevantamentoDetalhe';
import { RedirecionarComId } from './components/RedirecionarComId';
import { modulo } from './modulos';

const comercial = modulo('comercial');
const monitoramento = modulo('monitoramento');

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
