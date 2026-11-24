import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AlbumPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* 歓迎カード */}
      <div className="bg-white/80 border border-paper-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <span>ステップ① 接続成功！</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed mb-3">
          Supabaseへの接続と認証が完了しました。ログイン中のアカウント: <span className="font-semibold text-stone-800">{user?.email}</span>
        </p>

        <div className="p-3 bg-paper-100 rounded-xl space-y-2 text-xs text-stone-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>React + Vite + TypeScript 開発環境</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tailwind CSS スタイリング</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Supabase 認証（メール / Google）</span>
          </div>
        </div>
      </div>

      {/* まだ紙ものがない場合の空表示 */}
      <div className="text-center py-12 px-4 border-2 border-dashed border-paper-200 rounded-2xl bg-paper-100/40">
        <span className="text-4xl mb-3 block">📭</span>
        <h3 className="font-serif text-base font-bold text-amber-950 mb-1">
          紙ものがまだありません
        </h3>
        <p className="text-xs text-stone-500 max-w-xs mx-auto mb-5 leading-relaxed">
          スタンプや入場券、手紙などをカメラで撮影してコレクションに追加してみましょう。
        </p>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
        >
          <span>最初の紙ものを追加する（ステップ②で実装）</span>
        </Link>
      </div>
    </div>
  );
};
