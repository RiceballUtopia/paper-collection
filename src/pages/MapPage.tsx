import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PaperType, PAPER_TYPE_LABELS, Item, ItemWithUrl } from '../types';
import { MapPin, Calendar, ArrowRight, Loader2, Plus, Sparkles } from 'lucide-react';

// マーカーが複数ある場合に、すべてのピンが画面に収まるよう自動調整するコンポーネント
const FitBoundsToMarkers: React.FC<{ items: ItemWithUrl[] }> = ({ items }) => {
  const map = useMap();

  useEffect(() => {
    if (items.length === 0) return;

    if (items.length === 1 && items[0].lat && items[0].lng) {
      // 1件だけの場合はその地点にズーム
      map.setView([items[0].lat, items[0].lng], 13);
      return;
    }

    // 2件以上の場合はすべてのピンを含む境界ボックスを計算
    const bounds = L.latLngBounds(
      items
        .filter((it) => it.lat != null && it.lng != null)
        .map((it) => [it.lat as number, it.lng as number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [items, map]);

  return null;
};

export const MapPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<PaperType | 'all'>('all');

  // 位置情報が存在するアイテム一覧を取得
  const fetchMapItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // lat, lng が NULL でないものを取得
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

  // フィルター処理
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return items;
    return items.filter((item) => item.type === selectedFilter);
  }, [items, selectedFilter]);

  // 写真サムネイル付きの紙ものカスタムマーカーアイコンを生成
  const createPaperMarkerIcon = (item: ItemWithUrl) => {
    const thumbHtml = item.imageUrl
      ? `<div class="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-white ring-2 ring-amber-800/40">
           <img src="${item.imageUrl}" class="w-full h-full object-cover" />
         </div>
         <div class="w-2.5 h-2.5 bg-amber-800 rotate-45 mx-auto -mt-1 shadow-xs border border-white"></div>`
      : `<div class="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center shadow-md border-2 border-white">
           📍
         </div>`;

    return L.divIcon({
      html: thumbHtml,
      className: 'paper-map-marker',
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -44],
    });
  };

  // 地図のデフォルト中心（アイテムがあれば1件目、なければ東京駅）
  const defaultCenter: [number, number] = useMemo(() => {
    if (items.length > 0 && items[0].lat && items[0].lng) {
      return [items[0].lat, items[0].lng];
    }
    return [35.6812, 139.7671];
  }, [items]);

  return (
    <div className="relative -mx-4 -mt-4 h-[calc(100vh-130px)] flex flex-col">
      {/* 地図上部のフィルターバー */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto p-1.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-paper-200 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selectedFilter === 'all'
              ? 'bg-amber-900 text-white shadow-xs font-bold'
              : 'text-stone-600 hover:bg-paper-100'
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
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-900 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              {PAPER_TYPE_LABELS[type]} ({count})
            </button>
          );
        })}
      </div>

      {/* 地図本体 */}
      <div className="flex-1 w-full h-full relative z-0">
        {loading ? (
          <div className="w-full h-full bg-paper-100 flex flex-col items-center justify-center text-stone-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-800 mb-2" />
            <p className="text-xs">思い出の地図を広げています...</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={items.length > 0 ? 12 : 5}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 境界自動調整 */}
            <FitBoundsToMarkers items={filteredItems} />

            {/* 各ピンの描画 */}
            {filteredItems.map((item) => {
              if (item.lat == null || item.lng == null) return null;

              const formattedDate = new Date(item.taken_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
              });

              return (
                <Marker
                  key={item.id}
                  position={[item.lat, item.lng]}
                  icon={createPaperMarkerIcon(item)}
                >
                  <Popup className="paper-map-popup">
                    <div className="w-48 p-1 select-none font-sans">
                      {/* サムネイル画像 */}
                      {item.imageUrl && (
                        <div className="w-full h-28 rounded-xl overflow-hidden bg-paper-100 mb-2">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* 種類バッジ */}
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full mb-1">
                        {PAPER_TYPE_LABELS[item.type]}
                      </span>

                      {/* タイトル */}
                      <h4 className="font-serif font-bold text-xs text-amber-950 line-clamp-1 mb-1">
                        {item.title}
                      </h4>

                      {/* 日付と地名 */}
                      <div className="space-y-0.5 text-[10px] text-stone-500 mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{formattedDate}</span>
                        </div>
                        {item.place_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            <span className="truncate">{item.place_name}</span>
                          </div>
                        )}
                      </div>

                      {/* 詳細画面へのリンクボタン */}
                      <Link
                        to={`/items/${item.id}`}
                        className="w-full py-1.5 px-2 bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                      >
                        <span>詳しく見る</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* 位置情報付きアイテムが1件もない場合の案内カード */}
        {!loading && items.length === 0 && (
          <div className="absolute bottom-6 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-paper-300 shadow-xl text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>地図にピンがまだありません</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              紙ものを追加するときに「受け取った場所」を登録すると、この地図上にピンが並びます。
            </p>
            <Link
              to="/new"
              className="inline-flex items-center gap-1 px-4 py-2 bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>場所つきで紙ものを追加する</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
