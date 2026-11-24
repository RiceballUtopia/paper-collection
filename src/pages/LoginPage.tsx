import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabaseの接続情報（.env）が設定されていません。');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください。');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user && data.session === null) {
          setSuccessMessage(
            '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
          );
        } else {
          setSuccessMessage('登録が完了しました！');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Invalid login credentials')) {
        setErrorMessage('メールアドレスまたはパスワードが正しくありません。');
      } else if (err.message.includes('User already registered')) {
        setErrorMessage('このメールアドレスは既に登録されています。「ログイン」タブに切り替えてログインしてください。');
      } else {
        setErrorMessage(err.message || '認証エラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* アプリのロゴと新キャッチコピー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-900 text-white mb-3 shadow-md border-2 border-white ring-2 ring-amber-900/20">
            <span className="font-serif text-3xl font-bold">印</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-amber-950 tracking-widest">
            旅印
          </h1>
          <p className="text-[11px] text-stone-400 font-sans tracking-widest -mt-0.5 mb-2">
            たびじるし
          </p>
          <p className="text-xs text-stone-600 leading-relaxed font-sans px-2">
            旅先で出会った紙の記憶を、あなたの日本地図に。
          </p>
        </div>

        {/* Supabase未設定警告 */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed shadow-sm">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Supabase の設定が必要です</span>
            </div>
            <p>
              プロジェクト直下の <code>.env</code> ファイルに、Supabaseの <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。
            </p>
          </div>
        )}

        {/* ログイン / 新規登録 カード */}
        <div className="bg-white/80 backdrop-blur border border-paper-200/90 rounded-2xl shadow-sm p-6">
          <div className="flex border-b border-paper-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                !isSignUp
                  ? 'border-amber-800 text-amber-950 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isSignUp
                  ? 'border-amber-800 text-amber-950 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              新規登録
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-paper-50/70 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                パスワード（6文字以上）
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-paper-50/70 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full mt-2 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white text-sm font-medium rounded-xl shadow-sm transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>処理中...</span>
              ) : isSignUp ? (
                <span>アカウントを作成</span>
              ) : (
                <span>ログイン</span>
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-paper-200" />
            </div>
            <div className="relative flex justify-center text-[11px] text-stone-400">
              <span className="bg-white px-2">または</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!isSupabaseConfigured}
            className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Googleで続ける</span>
          </button>
        </div>
      </div>
    </div>
  );
};
