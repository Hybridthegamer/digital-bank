import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import History from './pages/History';
import Cards from './pages/Cards';
import MFASetup from './pages/MFASetup';
import Admin from './pages/Admin';
import Crypto from './pages/Crypto';
import GiftCards from './pages/GiftCards';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/transfer" element={
          <ProtectedRoute><Layout><Transfer /></Layout></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute><Layout><History /></Layout></ProtectedRoute>
        } />
        <Route path="/cards" element={
          <ProtectedRoute><Layout><Cards /></Layout></ProtectedRoute>
        } />
        <Route path="/crypto" element={
          <ProtectedRoute><Layout><Crypto /></Layout></ProtectedRoute>
        } />
        <Route path="/giftcards" element={
          <ProtectedRoute><Layout><GiftCards /></Layout></ProtectedRoute>
        } />
        <Route path="/mfa-setup" element={
          <ProtectedRoute><Layout><MFASetup /></Layout></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><Layout><Admin /></Layout></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
