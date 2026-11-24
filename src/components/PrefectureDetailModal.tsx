import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { geoMercator, geoPath } from 'd3-geo';
import japanGeoJson from '../data/japan-prefectures.json';
import { ItemWithUrl, PAPER_TYPE_LABELS } from '../types';
import { ArrowLeft, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface PrefectureDetailModalProps {
  prefCode: number;
  prefName: string;
  items: ItemWithUrl[]; // この県に属する全アイテム
  onBack: () => void;
}

// 種類ごとのスポットカラーと日本語ラベル（コントラスト重視）
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

  // 対象の都道府県 GeoJSON フィーチャーを抽出
  const feature = useMemo(() => {
    return (japanGeoJson as any).features.find(
      (f: any) => f.properties.code === prefCode
    );
  }, [prefCode]);

  // SVG サイズ
  const width = 360;
  const height = 300;

  // 都道府県の輪郭に合わせて自動拡大フィットするプロジェクション
  const { projection, pathData } = useMemo(() => {
    if (!feature) return { projection: null, pathData: '' };

    const proj = geoMercator().fitExtent(
      [
        [24, 24],
        [width - 24, height - 24],
      ],
      feature
    );

    const pathGen = geoPath().projection(proj);
    return {
      projection: proj,
      pathData: pathGen(feature) || '',
    };
  }, [feature, width, height]);

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
          <h3 className="font-serif text-lg font-bold text-amber-950">
            {prefName}
          </h3>
          <p className="text-[11px] text-stone-500 font-medium">
            {items.length} 件の記念品
          </p>
        </div>
      </div>

      {/* 都道府県の拡大地図カード */}
      <div className="bg-white rounded-3xl p-3 border border-paper-200/90 shadow-md">
        {/* 凡例バー */}
        <div className="flex items-center justify-between text-[10px] text-stone-600 px-2 pb-2 border-b border-paper-100">
          <span className="font-bold text-stone-700">訪問スポット凡例:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c1121f] inline-block shadow-2xs" />
              スタンプ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d3557] inline-block shadow-2xs" />
              半券・チケット
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b45309] inline-block shadow-2xs" />
              その他
            </span>
          </div>
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
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="drop-shadow-xs"
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
                  {/* スマホで押しやすい広めの透明タップターゲット（半径18px） */}
                  <circle cx={x} cy={y} r="18" fill="transparent" />

                  {/* 選択中の波紋エフェクト */}
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

                  {/* 視覚的なスポット円 */}
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

        {/* スポット情報プレビュー（タップしたピンの情報） */}
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
