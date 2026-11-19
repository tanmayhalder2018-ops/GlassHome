import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { DataProvider, useApp } from './lib/store';
import { ErrorState, Spinner, UiProvider } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const Courses = lazy(() => import('./pages/Courses'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payments = lazy(() => import('./pages/Payments'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Studio = lazy(() => import('./pages/Studio'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function Gate() {
  const { user, data, loading, error, reload, logout, isAdmin } = useApp();
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner label="Loading RZAMS Pro…" /></div>;
  if (!user) return <Login />;
  if (!data) return <div className="flex h-full items-center justify-center"><div className="card max-w-md"><ErrorState text={error || 'Could not load data.'} onRetry={reload} /><div className="pb-6 text-center"><button className="text-sm muted underline" onClick={logout}>Log out</button></div></div></div>;
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="courses" element={<Courses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payments" element={<Payments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="expenses" element={isAdmin ? <Expenses /> : <Navigate to="/" replace />} />
          <Route path="reports" element={<Reports />} />
          <Route path="studio" element={<Studio />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiProvider>
      <DataProvider>
        <BrowserRouter><Gate /></BrowserRouter>
      </DataProvider>
    </UiProvider>
  </StrictMode>,
);
