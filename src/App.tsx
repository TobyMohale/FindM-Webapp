import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Tap from './pages/Tap';
import Home from './pages/Home';
import ResetPassword from './pages/ResetPassword';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="admin" element={<Admin />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="claim/:tagId" element={<Dashboard />} />
          <Route path="t/:tagId" element={<Tap />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
