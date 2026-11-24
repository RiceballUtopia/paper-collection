import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { geoMercator, geoPath } from 'd3-geo';
import japanGeoJson from '../data/japan-prefectures.json';
import { ItemWithUrl, PAPER_TYPE_LABELS } from '../types';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Compass } from 'lucide-react';

interface PrefectureDetailModalProps {
  prefCode: number;
  prefName: string;
  items: ItemWithUrl[];
  onBack: () => void;
}

const SPOT_CONFIG = {
  stamp: { color: '#c1121f', label: 'スタンプ' },
  ticket: { color: '#1d3557', label: '半券・チケット' },
  other: { color: '#b45309', label: 'その他' },
};

export const PrefectureDetailModal: React.FC<PrefectureDetailModalProps> = ({
  prefCode,
  prefName,
  items,
  onBack,
}) => {
  const [selectedItem, setSelectedItem] = useState<ItemWithUrl | null>(items[0] || null);

  // 東京都（prefCode === 13）専用の表示切り替え（'mainland': 本土（23区・多摩） / 'islands': 伊豆・小笠原諸島）
  const [tokyoViewMode, setTokyoViewMode] = useState<'mainland' | 'islands'>('mainland');

  // 対象の都道府県 GeoJSON フィーチャーを抽出
  const rawFeature = useMemo(() => {
    return (japanGeoJson as any).features.find(
      (f: any) => f.properties.code === prefCode
    );
  }, [prefCode]);

  // 東京都の場合、本土と諸島にポリゴンを分割
  const activeFeature = useMemo(() => {
    if (!rawFeature) return null;

    // 東京都の場合
    if (prefCode === 13 && rawFeature.geometry.type === 'MultiPolygon') {
      const mainlandPolys = rawFeature.geometry.coordinates.filter((poly: any) => {
        const lats = poly[0].map((pt: any) => pt[1]);
        return Math.min(...lats) >= 35.45; // 北緯35.45度以上が本土
      });

      const islandsPolys = rawFeature.geometry.coordinates.filter((poly: any) => {
        const lats = poly[0].map((pt: any) => pt[1]);
        return Math.min(...lats) < 35.45; // 北緯35.45度未満が諸島
      });

      const targetCoordinates =
        tokyoViewMode === 'mainland'
          ? mainlandPolys.length > 0 ? mainlandPolys : rawFeature.geometry.coordinates
          : islandsPolys.length > 0 ? islandsPolys : rawFeature.geometry.coordinates;

      return {
        ...rawFeature,
        geometry: {
          type: 'MultiPolygon',
          coordinates: targetCoordinates,
        },
      };
    }

    return rawFeature;
  }, [rawFeature, prefCode, tokyoViewMode]);

  // SVG サイズ
  const width = 360;
  const height = 300;

  // 都道府県（または本土・諸島）に合わせて自動拡大フィットするプロジェクション
  const { projection, pathData } = useMemo(() => {
    if (!activeFeature) return { projection: null, pathData: '' };

    const proj = geoMercator().fitExtent(
      [
        [24, 24],
        [width - 24, height - 24],
      ],
      activeFeature
    );

    const pathGen = geoPath().projection(proj);
    return {
      projection: proj,
      pathData: pathGen(activeFeature) || '',
    };
  }, [activeFeature, width, height]);

  // 各アイテムの地図上のピクセル座標を計算
  const itemCoordinates = useMemo(() => {
    if (!projection) return [];

    return items
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => {
        const coords = projection([item.lng as number, item.lat as number]);
        return {
          item,
          x: coords ? coords[0] : -999,
          y: coords ? coords[1] : -999,
        };
      })
      // 画面内に収まるスポットのみ描画（本土モード時は本土内、諸島モード時は諸島内のスポット）
      .filter((pos) => pos.x >= 0 && pos.x <= width && pos.y >= 0 && pos.y <= height);
  }, [items, projection, width, height]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 戻るボタンと県名ヘッダー */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-paper-200/70 hover:bg-paper-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>日本地図へ戻る</span>
        </button>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <h3 className="font-serif text-lg font-bold text-amber-950">
              {prefName}
            </h3>
            {prefCode === 13 && (
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                {tokyoViewMode === 'mainland' ? '本土（23区・多摩）' : '伊豆・小笠原諸島'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 font-medium">
            {items.length} 件の記念品
          </p>
        </div>
      </div>

      {/* 都道府県の拡大地図カード */}
      <div className="bg-white rounded-3xl p-3.5 border border-paper-200/90 shadow-md">
        {/* 凡例バー & 東京都の諸島切り替えボタン */}
        <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-paper-100">
          {/* 凡例 */}
          <div className="flex items-center gap-2.5 text-[10px] text-stone-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c1121f] inline-block shadow-2xs" />
              スタンプ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d3557] inline-block shadow-2xs" />
              半券
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b45309] inline-block shadow-2xs" />
              その他
            </span>
          </div>

          {/* 東京都の場合の「諸島を見る／本土を見る」切り替えボタン */}
          {prefCode === 13 && (
            <button
              type="button"
              onClick={() => {
                setTokyoViewMode((prev) => (prev === 'mainland' ? 'islands' : 'mainland'));
                setSelectedItem(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-800/10 hover:bg-amber-800/20 text-amber-950 border border-amber-800/30 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-amber-800 animate-spin-slow" />
              <span>{tokyoViewMode === 'mainland' ? '諸島を見る' : '本土を見る'}</span>
            </button>
          )}
        </div>

        {/* 拡大SVG地図 */}
        <div className="relative w-full flex justify-center py-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full max-w-sm h-auto select-none"
          >
            {/* 都道府県の地形ポリゴン（やさしい紙色の白、少し影付き） */}
            <path
              d={pathData}
              fill="#f5f2eb"
              stroke="#2d6a4f"
              strokeWidth={prefCode === 13 && tokyoViewMode === 'islands' ? '2.5' : '1.5'}
              strokeLinejoin="round"
              className="drop-shadow-xs transition-all duration-300"
            />

            {/* 訪問スポットのプロット */}
            {itemCoordinates.map(({ item, x, y }) => {
              const config = SPOT_CONFIG[item.type] || SPOT_CONFIG.other;
              const isSelected = selectedItem?.id === item.id;

              return (
                <g
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <circle cx={x} cy={y} r="18" fill="transparent" />

                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill={config.color}
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 7 : 5}
                    fill={config.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="drop-shadow-sm transition-all"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* スポット情報プレビュー */}
        {selectedItem && (
          <div className="mt-2 p-3 bg-paper-100 rounded-2xl flex items-center justify-between gap-3 border border-paper-200">
            <div className="min-w-0 flex-1">
              <span
                className="inline-block px-2 py-0.5 text-white text-[9px] font-bold rounded-full mb-1"
                style={{
                  backgroundColor:
                    SPOT_CONFIG[selectedItem.type]?.color || '#b45309',
                }}
              >
                {PAPER_TYPE_LABELS[selectedItem.type]}
              </span>
              <h4 className="font-serif font-bold text-xs text-amber-950 truncate">
                {selectedItem.title}
              </h4>
              <p className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-800 flex-shrink-0" />
                <span>{selectedItem.place_name || `${prefName}内`}</span>
              </p>
            </div>

            <Link
              to={`/items/${selectedItem.id}`}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs whitespace-nowrap transition-colors"
            >
              <span>詳細</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* この都道府県の紙もの一覧サムネイル */}
      <div className="space-y-2 pt-1">
        <h4 className="font-serif font-bold text-xs text-amber-950">
          {prefName}で集めた紙もの ({items.length})
        </h4>

        {items.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            この都道府県の記録はまだありません。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => {
              const formattedDate = new Date(item.taken_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
              });

              return (
                <Link
                  key={item.id}
                  to={`/items/${item.id}`}
                  className="bg-white p-2 rounded-2xl border border-paper-200 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-2.5"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-paper-100 flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                        📜
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif font-bold text-xs text-amber-950 truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-stone-400 flex items-center gap-0.5 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </p>
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
