import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import InsightsPage from './pages/Insights';
import ResultsPage from './pages/Results';
import FindingsPage from './pages/Findings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="findings" element={<FindingsPage />} />
      </Route>
    </Routes>
  );
}
