import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BottomNav } from './BottomNav';

export const Layout: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-paper-50 text-paper-900">
      {/* 共通ヘッダー */}
      <header className="sticky top-0 z-20 bg-paper-100/90 backdrop-blur-md border-b border-paper-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          {/* 旅印を象徴する朱色の角印風アイコン */}
          <div className="w-7 h-7 rounded-lg bg-amber-900 text-white flex items-center justify-center font-serif text-sm font-bold shadow-2xs border border-amber-950/20">
            印
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-amber-950 tracking-wider leading-none">
              旅印
            </h1>
            <span className="text-[9px] text-stone-400 font-sans tracking-tight">
              たびじるし
            </span>
          </div>
        </div>

        {/* ユーザー情報＆ログアウトボタン */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 max-w-[130px] truncate" title={user.email ?? ''}>
              {user.email}
            </span>
            <button
              onClick={() => signOut()}
              title="ログアウト"
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-paper-200/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* メイン画面（下部ナビにかぶらないよう余白を確保） */}
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* 画面下部の共通タブバー */}
      <BottomNav />
    </div>
  );
};
