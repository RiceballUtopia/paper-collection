// 紙ものの種類（4種類）
export type PaperType = 'stamp' | 'ticket' | 'letter' | 'other';

// 各種別の日本語ラベルとアイコン表示用の定義
export const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  stamp: 'スタンプ',
  ticket: '半券・チケット',
  letter: '手紙',
  other: 'その他',
};

// データベースの items テーブルのデータ構造
export interface Item {
  id: string;              // アイテムの一意なID (UUID)
  user_id: string;         // 作成したユーザーのID
  type: PaperType;         // 紙ものの種類
  title: string;           // タイトル
  memo: string | null;     // メモ（任意）
  image_path: string;      // Supabase Storage 内の画像パス
  taken_at: string;        // 手に入れた日時・撮影日時 (ISO形式の文字列)
  lat: number | null;      // 緯度
  lng: number | null;      // 経度
  place_name: string | null; // 場所の名前
  created_at: string;      // 登録日時
}

// 画面表示用：署名付き画像URLを追加したアイテム型
export interface ItemWithUrl extends Item {
  imageUrl: string;
}

// アイテム新規登録時の入力データ型
export interface CreateItemInput {
  type: PaperType;
  title: string;
  memo?: string;
  taken_at: string;
  lat?: number | null;
  lng?: number | null;
  place_name?: string | null;
  imageFile: Blob;
}

// アイテム更新時の入力データ型
export interface UpdateItemInput {
  type: PaperType;
  title: string;
  memo?: string | null;
  taken_at: string;
}
