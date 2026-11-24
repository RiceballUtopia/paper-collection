import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PaperType, PAPER_TYPE_LABELS, Item, ItemWithUrl } from '../types';
import { TiltCard } from '../components/TiltCard';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit3,
  Trash2,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<ItemWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 編集モード関連ステート
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<PaperType>('stamp');
  const [editDate, setEditDate] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 削除確認モーダル関連ステート
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // アイテム詳細データの読み込み
  const fetchItemDetail = useCallback(async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      setError(null);

      // items テーブルから対象IDを取得
      const { data, error: dbError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError) throw dbError;
      if (!data) throw new Error('アイテムが見つかりませんでした。');

      const rawItem = data as Item;

      // 画像の署名付きURLを取得（1時間有効）
      const { data: signedData, error: signedError } = await supabase.storage
        .from('paper-items')
        .createSignedUrl(rawItem.image_path, 3600);

      const itemWithUrl: ItemWithUrl = {
        ...rawItem,
        imageUrl: signedError || !signedData ? '' : signedData.signedUrl,
      };

      setItem(itemWithUrl);

      // 編集フォームの初期値をセット
      setEditTitle(rawItem.title);
      setEditType(rawItem.type);
      setEditDate(rawItem.taken_at.split('T')[0]);
      setEditMemo(rawItem.memo || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchItemDetail();
  }, [fetchItemDetail]);

  // 編集の保存処理
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editTitle.trim()) return;

    try {
      setIsSavingEdit(true);
      const updatedTakenAt = new Date(`${editDate}T12:00:00Z`).toISOString();

      const { error: updateError } = await supabase
        .from('items')
        .update({
          title: editTitle.trim(),
          type: editType,
          taken_at: updatedTakenAt,
          memo: editMemo.trim() || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 画面上のステートを更新
      setItem((prev) =>
        prev
          ? {
              ...prev,
              title: editTitle.trim(),
              type: editType,
              taken_at: updatedTakenAt,
              memo: editMemo.trim() || null,
            }
          : null
      );

      setIsEditing(false);
    } catch (err: any) {
      alert(`更新に失敗しました: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // アイテムの削除処理
  const handleDelete = async () => {
    if (!item) return;

    try {
      setIsDeleting(true);

      // 1. Storage内の画像ファイルを削除
      await supabase.storage.from('paper-items').remove([item.image_path]);

      // 2. items テーブルのレコードを削除
      const { error: dbDeleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (dbDeleteError) throw dbDeleteError;

      // 完了したらアルバムへ戻る
      navigate('/', { replace: true });
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-800" />
        <p className="text-xs">紙ものを開いています...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-stone-600">{error || 'アイテムが見つかりませんでした。'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 text-white text-xs font-medium rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>アルバムに戻る</span>
        </Link>
      </div>
    );
  }

  // 日付の日本語表示
  const formattedDate = new Date(item.taken_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* 上部ナビゲーションバー（戻るボタン & 編集・削除ボタン） */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 py-1.5 px-2 rounded-lg hover:bg-paper-200/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>戻る</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white/90 hover:bg-white border border-stone-200 rounded-lg shadow-2xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>編集</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 傾き・光沢エフェクト付きのメインカード */}
      <TiltCard className="bg-white p-3.5 border border-paper-200 shadow-lg">
        {/* 写真領域 */}
        <div className="relative rounded-2xl overflow-hidden bg-stone-900/5 max-h-[65vh] flex items-center justify-center">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-auto max-h-[60vh] object-contain mx-auto select-none pointer-events-none"
            />
          ) : (
            <div className="py-20 text-stone-400 text-xs">画像を読み込めませんでした</div>
          )}
        </div>

        {/* 写真の下の紙もの情報 */}
        <div className="pt-4 pb-2 px-1.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-full mb-1">
                {PAPER_TYPE_LABELS[item.type]}
              </span>
              <h1 className="font-serif font-bold text-lg text-amber-950 leading-snug">
                {item.title}
              </h1>
            </div>
          </div>

          {/* 日付と場所 */}
          <div className="space-y-1 pt-1 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-800 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {item.place_name && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-800 flex-shrink-0" />
                <span className="truncate">{item.place_name}</span>
              </div>
            )}
          </div>

          {/* メモ（記入されている場合） */}
          {item.memo && (
            <div className="pt-2 mt-2 border-t border-paper-100">
              <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed bg-paper-50 p-3 rounded-xl border border-paper-200/60 font-sans">
                {item.memo}
              </p>
            </div>
          )}
        </div>
      </TiltCard>

      {/* 編集モーダル */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-paper-200 mb-4">
              <h3 className="font-serif text-base font-bold text-amber-950">
                記録を編集する
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* 種類選択 */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  種類
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                        editType === t
                          ? 'border-amber-800 bg-amber-800 text-white font-bold'
                          : 'border-paper-200 bg-white text-stone-700'
                      }`}
                    >
                      {PAPER_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-paper-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  受け取った日
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-paper-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              {/* メモ */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-paper-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 px-3 border border-stone-300 text-stone-700 text-xs font-medium rounded-xl hover:bg-stone-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="flex-1 py-2.5 px-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>更新する</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                この紙ものを削除しますか？
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              保存した画像と記録が完全に削除されます。この操作は取り消せません。
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 border border-stone-300 text-stone-700 text-xs font-medium rounded-xl hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>削除する</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
