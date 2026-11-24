import React, { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import japanGeoJson from '../data/japan-prefectures.json';

interface JapanMapProps {
  visitedPrefCodes: Set<number>;
  onSelectPrefecture: (code: number, name: string) => void;
  accentColor?: string; // 訪問済みの色（デフォルトは深緑）
}

export const JapanMap: React.FC<JapanMapProps> = ({
  visitedPrefCodes,
  onSelectPrefecture,
  accentColor = '#2d6a4f',
}) => {
  // SVG の基準キャンバスサイズ
  const width = 380;
  const height = 480;

  // 1. 本土（北海道・本州・四国・九州：沖縄以外）のプロジェクション
  const mainlandProjection = useMemo(() => {
    return geoMercator()
      .center([137.5, 38.2]) // 本土中心
      .scale(1200)
      .translate([width / 2 + 10, height / 2 - 20]);
  }, [width, height]);

  const mainlandPathGenerator = useMemo(() => {
    return geoPath().projection(mainlandProjection);
  }, [mainlandProjection]);

  // 2. 沖縄インセット用のプロジェクション（左下の小窓の中に拡大表示）
  const okinawaBox = { x: 12, y: height - 125, w: 105, h: 110 };

  const okinawaProjection = useMemo(() => {
    return geoMercator()
      .center([127.8, 26.4]) // 沖縄本島中心
      .scale(2100)
      .translate([okinawaBox.x + okinawaBox.w / 2, okinawaBox.y + okinawaBox.h / 2 + 5]);
  }, [okinawaBox.x, okinawaBox.y, okinawaBox.w, okinawaBox.h]);

  const okinawaPathGenerator = useMemo(() => {
    return geoPath().projection(okinawaProjection);
  }, [okinawaProjection]);

  // 本土のフィーチャーと沖縄のフィーチャーに分離
  const { mainlandFeatures, okinawaFeature } = useMemo(() => {
    const mainland: any[] = [];
    let okinawa: any = null;

    for (const feat of (japanGeoJson as any).features) {
      if (feat.properties.code === 47) {
        okinawa = feat;
      } else {
        mainland.push(feat);
      }
    }
    return { mainlandFeatures: mainland, okinawaFeature: okinawa };
  }, []);

  return (
    <div className="w-full flex justify-center select-none py-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-sm h-auto drop-shadow-xs"
        style={{ touchAction: 'manipulation' }}
      >
        {/* 背景の紙のような柔らかいテクスチャ枠 */}
        <rect width={width} height={height} fill="#fbfaf7" rx="24" />

        {/* 地方区分の控えめなテキストラベル */}
        <g className="text-[10px] fill-stone-400 font-sans tracking-widest pointer-events-none select-none">
          <text x="290" y="55">北海道・東北</text>
          <text x="295" y="270">関東</text>
          <text x="175" y="200">中部</text>
          <text x="135" y="260">近畿</text>
          <text x="70" y="220">中国・四国</text>
          <text x="35" y="320">九州</text>
        </g>

        {/* 本土（46都道府県）の描画 */}
        <g>
          {mainlandFeatures.map((feature: any) => {
            const code = feature.properties.code as number;
            const name = feature.properties.name as string;
            const isVisited = visitedPrefCodes.has(code);
            const pathData = mainlandPathGenerator(feature) || '';

            return (
              <path
                key={code}
                d={pathData}
                onClick={() => onSelectPrefecture(code, name)}
                fill={isVisited ? accentColor : '#ffffff'}
                stroke="#d6cdbe"
                strokeWidth="0.8"
                strokeLinejoin="round"
                className="cursor-pointer transition-colors duration-200 hover:brightness-95 active:opacity-80"
              >
                <title>{name}</title>
              </path>
            );
          })}
        </g>

        {/* 沖縄インセット小窓（左下の別枠） */}
        <g>
          {/* 小窓の背景と枠線 */}
          <rect
            x={okinawaBox.x}
            y={okinawaBox.y}
            width={okinawaBox.w}
            height={okinawaBox.h}
            fill="#ffffff"
            stroke="#d6cdbe"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            rx="12"
          />
          <text
            x={okinawaBox.x + 8}
            y={okinawaBox.y + 16}
            className="text-[9px] fill-stone-400 font-sans tracking-wider"
          >
            沖縄県
          </text>

          {/* 沖縄県のポリゴン */}
          {okinawaFeature && (
            <path
              d={okinawaPathGenerator(okinawaFeature) || ''}
              onClick={() => onSelectPrefecture(47, '沖縄県')}
              fill={visitedPrefCodes.has(47) ? accentColor : '#ffffff'}
              stroke="#d6cdbe"
              strokeWidth="0.8"
              strokeLinejoin="round"
              className="cursor-pointer transition-colors duration-200 hover:brightness-95 active:opacity-80"
            >
              <title>沖縄県</title>
            </path>
          )}
        </g>
      </svg>
    </div>
  );
};
