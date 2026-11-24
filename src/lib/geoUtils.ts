import { geoContains } from 'd3-geo';
import japanGeoJson from '../data/japan-prefectures.json';

// 都道府県の定義（JIS X 0401: 1〜47）
export interface PrefectureInfo {
  code: number;
  name: string;
  region: string;
  center: [number, number]; // [lng, lat] 代表座標
}

export const PREFECTURES: PrefectureInfo[] = [
  { code: 1, name: '北海道', region: '北海道・東北', center: [142.3, 43.4] },
  { code: 2, name: '青森県', region: '北海道・東北', center: [140.7, 40.8] },
  { code: 3, name: '岩手県', region: '北海道・東北', center: [141.3, 39.7] },
  { code: 4, name: '宮城県', region: '北海道・東北', center: [140.9, 38.3] },
  { code: 5, name: '秋田県', region: '北海道・東北', center: [140.1, 39.7] },
  { code: 6, name: '山形県', region: '北海道・東北', center: [140.1, 38.4] },
  { code: 7, name: '福島県', region: '北海道・東北', center: [140.4, 37.5] },
  { code: 8, name: '茨城県', region: '関東', center: [140.4, 36.3] },
  { code: 9, name: '栃木県', region: '関東', center: [139.8, 36.6] },
  { code: 10, name: '群馬県', region: '関東', center: [139.0, 36.4] },
  { code: 11, name: '埼玉県', region: '関東', center: [139.4, 35.9] },
  { code: 12, name: '千葉県', region: '関東', center: [140.2, 35.5] },
  { code: 13, name: '東京都', region: '関東', center: [139.6, 35.7] },
  { code: 14, name: '神奈川県', region: '関東', center: [139.4, 35.4] },
  { code: 15, name: '新潟県', region: '中部', center: [139.0, 37.6] },
  { code: 16, name: '富山県', region: '中部', center: [137.2, 36.7] },
  { code: 17, name: '石川県', region: '中部', center: [136.7, 36.8] },
  { code: 18, name: '福井県', region: '中部', center: [136.2, 35.9] },
  { code: 19, name: '山梨県', region: '中部', center: [138.6, 35.6] },
  { code: 20, name: '長野県', region: '中部', center: [138.1, 36.2] },
  { code: 21, name: '岐阜県', region: '中部', center: [136.9, 35.7] },
  { code: 22, name: '静岡県', region: '中部', center: [138.3, 35.0] },
  { code: 23, name: '愛知県', region: '中部', center: [137.0, 35.0] },
  { code: 24, name: '三重県', region: '近畿', center: [136.5, 34.6] },
  { code: 25, name: '滋賀県', region: '近畿', center: [136.0, 35.2] },
  { code: 26, name: '京都府', region: '近畿', center: [135.6, 35.1] },
  { code: 27, name: '大阪府', region: '近畿', center: [135.5, 34.6] },
  { code: 28, name: '兵庫県', region: '近畿', center: [134.8, 35.0] },
  { code: 29, name: '奈良県', region: '近畿', center: [135.8, 34.4] },
  { code: 30, name: '和歌山県', region: '近畿', center: [135.4, 33.9] },
  { code: 31, name: '鳥取県', region: '中国・四国', center: [133.8, 35.4] },
  { code: 32, name: '島根県', region: '中国・四国', center: [132.6, 34.8] },
  { code: 33, name: '岡山県', region: '中国・四国', center: [133.8, 34.9] },
  { code: 34, name: '広島県', region: '中国・四国', center: [132.7, 34.5] },
  { code: 35, name: '山口県', region: '中国・四国', center: [131.5, 34.2] },
  { code: 36, name: '徳島県', region: '中国・四国', center: [134.3, 33.9] },
  { code: 37, name: '香川県', region: '中国・四国', center: [134.0, 34.2] },
  { code: 38, name: '愛媛県', region: '中国・四国', center: [132.8, 33.7] },
  { code: 39, name: '高知県', region: '中国・四国', center: [133.4, 33.6] },
  { code: 40, name: '福岡県', region: '九州・沖縄', center: [130.6, 33.6] },
  { code: 41, name: '佐賀県', region: '九州・沖縄', center: [130.1, 33.2] },
  { code: 42, name: '長崎県', region: '九州・沖縄', center: [129.8, 33.0] },
  { code: 43, name: '熊本県', region: '九州・沖縄', center: [130.7, 32.7] },
  { code: 44, name: '大分県', region: '九州・沖縄', center: [131.4, 33.2] },
  { code: 45, name: '宮崎県', region: '九州・沖縄', center: [131.3, 32.2] },
  { code: 46, name: '鹿児島県', region: '九州・沖縄', center: [130.5, 31.6] },
  { code: 47, name: '沖縄県', region: '九州・沖縄', center: [127.8, 26.3] },
];

export const PREFECTURE_MAP = new Map(PREFECTURES.map((p) => [p.code, p]));

/**
 * 緯度・経度から、日本の都道府県コード（JIS X 0401: 1〜47）を判定します。
 * 住所文字列ではなく、d3-geo の地理ポリゴン包含判定（geoContains）を使用します。
 */
export function getPrefectureCodeFromCoordinates(lat: number, lng: number): number | null {
  const point: [number, number] = [lng, lat];

  // 1. 各都道府県のGeoJSONポリゴンに対して包含判定
  for (const feature of (japanGeoJson as any).features) {
    try {
      if (geoContains(feature, point)) {
        return feature.properties.code as number;
      }
    } catch {
      // 判定エラー時はスキップ
    }
  }

  // 2. 海岸線ぎりぎりや埋立地・港湾部等でポリゴン判定からわずかに外れた場合：
  // 代表中心点からのユークリッド距離が最も近い都道府県をフォールバック選択（日本近海の場合）
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 149) {
    let nearestCode = 1;
    let minDist = Infinity;

    for (const pref of PREFECTURES) {
      const dist = Math.hypot(lng - pref.center[0], lat - pref.center[1]);
      if (dist < minDist) {
        minDist = dist;
        nearestCode = pref.code;
      }
    }

    // 日本国内からあまりに離れている場合（例: 海外等）は null
    if (minDist < 2.5) {
      return nearestCode;
    }
  }

  return null;
}
