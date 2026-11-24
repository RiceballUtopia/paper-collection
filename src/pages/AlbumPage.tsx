import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PaperType, PAPER_TYPE_LABELS, Item, ItemWithUrl } from '../types';
import { Plus, Calendar, MapPin, Loader2, Sparkles } from 'lucide-react';

export const AlbumPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<PaperType | 'all'>('all');

  // Supabaseからアイテム一覧と画像の署名付きURLを取得する関数
  const fetchItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. items テーブルから、受け取った日（taken_at）の新しい順に取得
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('taken_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setItems([]);
        return;
      }

      const rawItems = data as Item[];

      // 2. 各アイテムの非公開画像に対して、表示用の署名付きURL（60分有効）を一括取得
      const itemsWithSignedUrls = await Promise.all(
        rawItems.map(async (item) => {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('paper-items')
            .createSignedUrl(item.image_path, 3600); // 1時間有効

          return {
            ...item,
            imageUrl: signedError || !signedData ? '' : signedData.signedUrl,
          };
        })
      );

      setItems(itemsWithSignedUrls);
    } catch (err) {
      console.error('アイテムの取得に失敗しました:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 選択中の種類（フィルター）で絞り込み
  const filteredItems = items.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.type === selectedFilter;
  });

  return (
    <div className="space-y-4">
      {/* 画面ヘッダー部：タイトルと件数 */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <h2 className="font-serif text-xl font-bold text-amber-950">
            集めた紙もの
          </h2>
          <p className="text-[11px] text-stone-500">
            {loading ? '読み込み中...' : `${items.length} 点の思い出`}
          </p>
        </div>

        {/* 右上の「追加」ミニボタン */}
        <Link
          to="/new"
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-full shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>追加</span>
        </Link>
      </div>

      {/* 種類別フィルターバー（横スクロール可能） */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selectedFilter === 'all'
              ? 'bg-amber-900 text-white shadow-xs font-bold'
              : 'bg-white/80 text-stone-600 hover:bg-paper-200/70 border border-paper-200'
          }`}
        >
          すべて ({items.length})
        </button>

        {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((type) => {
          const count = items.filter((item) => item.type === type).length;
          const isSelected = selectedFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-900 text-white shadow-xs font-bold'
                  : 'bg-white/80 text-stone-600 hover:bg-paper-200/70 border border-paper-200'
              }`}
            >
              {PAPER_TYPE_LABELS[type]} ({count})
            </button>
          );
        })}
      </div>

      {/* コンテンツ領域 */}
      {loading ? (
        // ローディング表示
        <div className="py-20 text-center text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-800" />
          <p className="text-xs">アルバムを開いています...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        // アイテムが0件の場合の空表示
        <div className="text-center py-16 px-4 bg-white/70 border-2 border-dashed border-paper-300 rounded-3xl mt-4">
          <span className="text-4xl block mb-2">📜</span>
          <h3 className="font-serif text-base font-bold text-amber-950 mb-1">
            {selectedFilter === 'all'
              ? 'まだ紙ものがありません'
              : `「${PAPER_TYPE_LABELS[selectedFilter]}」の紙ものがありません`}
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto mb-5 leading-relaxed">
            旅先で受け取ったスタンプやチケットを写真に撮って追加してみましょう。
          </p>
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>最初の1枚を保存する</span>
          </Link>
        </div>
      ) : (
        // グリッド表示（2列のアルバムレイアウト）
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          {filteredItems.map((item) => {
            // 日付を「2026/11/24」のように見やすく整形
            const formattedDate = new Date(item.taken_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            });

            return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-paper-200/90 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* 写真エリア（正方形寄りのアスペクト比） */}
                <div className="relative aspect-square w-full bg-paper-100 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  )}

                  {/* 種類バッジ（写真の左上に浮かせる） */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium rounded-full shadow-xs">
                    {PAPER_TYPE_LABELS[item.type]}
                  </span>
                </div>

                {/* 情報エリア（紙の手帖風の余白とタイポグラフィ） */}
                <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="font-serif font-bold text-xs text-amber-950 line-clamp-1 group-hover:text-amber-800 transition-colors">
                      {item.title}
                    </h3>

                    {/* 場所名（あれば表示） */}
                    {item.place_name && (
                      <p className="text-[10px] text-stone-500 flex items-center gap-0.5 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-amber-700/80 flex-shrink-0" />
                        <span className="truncate">{item.place_name}</span>
                      </p>
                    )}
                  </div>

                  {/* 日付 */}
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-2 pt-1 border-t border-paper-100">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
