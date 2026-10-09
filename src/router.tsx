import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Levantamentos from './pages/Levantamentos';
import Relatorios from './pages/Relatorios';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import ClienteDetalhe from './pages/ClienteDetalhe';
import LevantamentoDetalhe from './pages/LevantamentoDetalhe';

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
      { index: true, element: <Clientes /> },
      // Rota antiga: mantém links/favoritos funcionando
      { path: 'clientes', element: <Navigate to="/" replace /> },
      { path: 'levantamentos', element: <Levantamentos /> },
      { path: 'relatorios', element: <Relatorios /> },
      { path: 'clientes/:id', element: <ClienteDetalhe /> },
      { path: 'levantamentos/:id', element: <LevantamentoDetalhe /> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);