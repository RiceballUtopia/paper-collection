import { createClient } from '@supabase/supabase-js';

// Viteの環境変数からSupabaseの接続情報を取得します
// ※ .env ファイルに定義します（例: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 設定が正しく入っているかチェックするためのフラグ
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co'
);

if (!isSupabaseConfigured) {
  console.warn(
    '【注意】SupabaseのURLまたはANON KEYが設定されていません。.envファイルを確認してください。'
  );
}

// アプリ全体で使い回すSupabaseクライアントを作成してエクスポート
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
