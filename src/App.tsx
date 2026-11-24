import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { AlbumPage } from './pages/AlbumPage';
import { AddItemPage } from './pages/AddItemPage';
import { MapPage } from './pages/MapPage';

// ログイン必須のルートを保護するコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // ログイン確認中（ロード中）
  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-stone-500 font-sans">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログインの場合はログイン画面へ転送
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ログイン済みユーザーが再度ログイン画面に来たときはアルバムへリダイレクト
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ログイン画面 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* ログイン必須のメイン画面（共通レイアウト付き） */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AlbumPage />} />
            <Route path="new" element={<AddItemPage />} />
            <Route path="map" element={<MapPage />} />
          </Route>

          {/* 想定外のURLはトップへリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
