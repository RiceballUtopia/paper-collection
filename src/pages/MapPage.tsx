import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Item, ItemWithUrl, PaperType, PAPER_TYPE_LABELS } from '../types';
import { JapanMap } from '../components/JapanMap';
import { PrefectureDetailModal } from '../components/PrefectureDetailModal';
import { getPrefectureCodeFromCoordinates } from '../lib/geoUtils';
import { Loader2, Sparkles, Award, MapPin, Calendar } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  // マップ種類のタブ切り替え：「スタンプ」または「半券・チケット」
  const [mapType, setMapType] = useState<'stamp' | 'ticket'>('stamp');

  // 地図の下の一覧用のフィルター：「all」または各PaperType（すべて、スタンプ、半券・チケット、その他）
  const [listFilter, setListFilter] = useState<PaperType | 'all'>('all');

  // 選択中の都道府県（拡大画面表示用、null のときは全体日本地図）
  const [selectedPref, setSelectedPref] = useState<{ code: number; name: string } | null>(null);

  // アイテム一覧を取得
  const fetchMapItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('taken_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setItems([]);
        return;
      }

      const rawItems = data as Item[];

      // 既存アイテムで pref_code が未設定のものを自動補完してDB更新
      for (const it of rawItems) {
        if (!it.pref_code && it.lat && it.lng) {
          const code = getPrefectureCodeFromCoordinates(it.lat, it.lng);
          if (code) {
            it.pref_code = code;
            supabase.from('items').update({ pref_code: code }).eq('id', it.id).then();
          }
        }
      }

      // 署名付き画像URLを一括取得
      const itemsWithUrls = await Promise.all(
        rawItems.map(async (item) => {
          const { data: signedData } = await supabase.storage
            .from('paper-items')
            .createSignedUrl(item.image_path, 3600);

          return {
            ...item,
            imageUrl: signedData?.signedUrl || '',
          };
        })
      );

      setItems(itemsWithUrls);
    } catch (err) {
      console.error('地図アイテムの取得に失敗しました:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMapItems();
  }, [fetchMapItems]);

  // 現在選択中のマップ種別（スタンプ / 半券・チケット）のアイテム
  const currentCategoryMapItems = useMemo(() => {
    return items.filter((item) => item.type === mapType);
  }, [items, mapType]);

  // 訪問済みの都道府県コードの Set（1〜47）
  const visitedPrefCodes = useMemo(() => {
    const codes = new Set<number>();
    for (const item of currentCategoryMapItems) {
      if (item.pref_code) {
        codes.add(item.pref_code);
      }
    }
    return codes;
  }, [currentCategoryMapItems]);

  // 地図下のコレクション一覧用フィルター処理
  const filteredListItems = useMemo(() => {
    if (listFilter === 'all') return items;
    return items.filter((item) => item.type === listFilter);
  }, [items, listFilter]);

  // 選択された都道府県のアイテム一覧
  const selectedPrefItems = useMemo(() => {
    if (!selectedPref) return [];
    return items.filter((item) => item.pref_code === selectedPref.code);
  }, [items, selectedPref]);

  if (loading) {
    return (
      <div className="py-24 text-center text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-800" />
        <p className="text-xs">日本の白地図を広げています...</p>
      </div>
    );
  }

  // 都道府県が選択されている場合は、拡大地図画面を表示
  if (selectedPref) {
    return (
      <PrefectureDetailModal
        prefCode={selectedPref.code}
        prefName={selectedPref.name}
        items={selectedPrefItems}
        onBack={() => setSelectedPref(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* 画面上部：マップ切り替えタブ（スタンプ / 半券・チケット） */}
      <div className="bg-paper-200/60 p-1 rounded-2xl flex border border-paper-200">
        <button
          type="button"
          onClick={() => setMapType('stamp')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mapType === 'stamp'
              ? 'bg-amber-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          スタンプの旅
        </button>
        <button
          type="button"
          onClick={() => setMapType('ticket')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mapType === 'ticket'
              ? 'bg-amber-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          半券・チケットの旅
        </button>
      </div>

      {/* 訪問実績ステータスカード */}
      <div className="bg-white rounded-3xl p-4 border border-paper-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/60">
            <Award className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] text-stone-500 font-medium">訪問達成度</span>
            <div className="flex items-baseline gap-1">
              <span className="font-serif font-bold text-2xl text-emerald-850">
                {visitedPrefCodes.size}
              </span>
              <span className="text-xs text-stone-400 font-bold">/ 47 都道府県</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-stone-600">
            {Math.round((visitedPrefCodes.size / 47) * 100)}%
          </span>
          <p className="text-[9px] text-stone-400">訪問完了</p>
        </div>
      </div>

      {/* 日本の白地図エリア */}
      <div className="bg-white rounded-3xl p-3 border border-paper-200 shadow-md">
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>県をタップすると詳細マップが開きます</span>
          </div>
          <span className="text-[10px] text-stone-400">緑: 訪問済み</span>
        </div>

        <JapanMap
          visitedPrefCodes={visitedPrefCodes}
          accentColor="#2d6a4f"
          onSelectPrefecture={(code, name) => {
            setSelectedPref({ code, name });
          }}
        />
      </div>

      {/* 地図の下：コレクション一覧セクション */}
      <div className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between px-1">
          <div>
            <h3 className="font-serif font-bold text-base text-amber-950">
              集めた旅の記録
            </h3>
            <p className="text-[11px] text-stone-500">
              {filteredListItems.length} 点の記念品
            </p>
          </div>
        </div>

        {/* フィルターバー（すべて / スタンプ / 半券・チケット / その他） */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setListFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              listFilter === 'all'
                ? 'bg-amber-900 text-white shadow-xs font-bold'
                : 'bg-white/80 text-stone-600 hover:bg-paper-200/70 border border-paper-200'
            }`}
          >
            すべて ({items.length})
          </button>

          {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((type) => {
            const count = items.filter((item) => item.type === type).length;
            const isSelected = listFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setListFilter(type)}
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

        {/* アイテムグリッド一覧（アルバム画面と共通のデザイン） */}
        {filteredListItems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white/70 border-2 border-dashed border-paper-300 rounded-3xl">
            <span className="text-3xl block mb-2">📜</span>
            <p className="font-serif text-sm font-bold text-amber-950 mb-1">
              {listFilter === 'all'
                ? 'まだ旅の記録がありません'
                : `「${PAPER_TYPE_LABELS[listFilter]}」の記録がありません`}
            </p>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              旅先で受け取ったスタンプやチケットを追加してみましょう。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredListItems.map((item) => {
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
                  {/* 写真サムネイル */}
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

                    {/* 種類バッジ */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium rounded-full shadow-xs">
                      {PAPER_TYPE_LABELS[item.type]}
                    </span>
                  </div>

                  {/* 情報エリア */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <h4 className="font-serif font-bold text-xs text-amber-950 line-clamp-1 group-hover:text-amber-800 transition-colors">
                        {item.title}
                      </h4>

                      {item.place_name && (
                        <p className="text-[10px] text-stone-500 flex items-center gap-0.5 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-amber-700/80 flex-shrink-0" />
                          <span className="truncate">{item.place_name}</span>
                        </p>
                      )}
                    </div>

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
    </div>
  );
};
