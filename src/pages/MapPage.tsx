import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Item, ItemWithUrl } from '../types';
import { JapanMap } from '../components/JapanMap';
import { PrefectureDetailModal } from '../components/PrefectureDetailModal';
import { getPrefectureCodeFromCoordinates } from '../lib/geoUtils';
import { Loader2, Sparkles, Award } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  // マップ種類のタブ切り替え：「スタンプ」または「半券・チケット」
  const [mapType, setMapType] = useState<'stamp' | 'ticket'>('stamp');

  // 選択中の都道府県（拡大画面表示用、null のときは全体日本地図）
  const [selectedPref, setSelectedPref] = useState<{ code: number; name: string } | null>(null);

  // 位置情報が存在するアイテム一覧を取得
  const fetchMapItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
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
            // バックグラウンドでDB更新
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
  const currentCategoryItems = useMemo(() => {
    return items.filter((item) => item.type === mapType);
  }, [items, mapType]);

  // 訪問済みの都道府県コードの Set（1〜47）
  const visitedPrefCodes = useMemo(() => {
    const codes = new Set<number>();
    for (const item of currentCategoryItems) {
      if (item.pref_code) {
        codes.add(item.pref_code);
      }
    }
    return codes;
  }, [currentCategoryItems]);

  // 選択された都道府県のアイテム一覧（スタンプと半券の両方、または選択中の種別）
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
    <div className="space-y-4 max-w-md mx-auto">
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

      {/* 訪問実績ステータスカード（白地図の上部） */}
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

        {/* 達成率パーセント表示 */}
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

        {/* SVG 白地図 */}
        <JapanMap
          visitedPrefCodes={visitedPrefCodes}
          accentColor="#2d6a4f"
          onSelectPrefecture={(code, name) => {
            setSelectedPref({ code, name });
          }}
        />
      </div>
    </div>
  );
};
