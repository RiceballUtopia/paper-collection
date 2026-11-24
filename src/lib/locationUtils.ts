/**
 * 位置情報（Geolocation API）を安全に取得する関数
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('お使いの端末・ブラウザは位置情報に対応していません。'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = '位置情報の取得に失敗しました。';
        if (error.code === error.PERMISSION_DENIED) {
          msg = '位置情報の利用が許可されていません。';
        } else if (error.code === error.TIMEOUT) {
          msg = '位置情報の取得がタイムアウトしました。';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * 緯度・経度から地名（市区町村など）を取得する（逆ジオコーディング）
 * OpenStreetMap の無料API (Nominatim) を利用します。
 */
export async function getPlaceNameFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'ja,en',
        },
      }
    );

    if (!res.ok) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await res.json();
    const addr = data.address;

    if (!addr) {
      return data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    // 日本の住所に配慮した地名の組み立て
    // 例: "東京都台東区上野公園", "京都市左京区", "北海道札幌市中央区"
    const prefecture = addr.province || addr.prefecture || addr.state || '';
    const city = addr.city || addr.ward || addr.town || addr.village || addr.county || '';
    const suburb = addr.suburb || addr.quarter || addr.neighbourhood || '';

    const parts = [prefecture, city, suburb].filter(Boolean);
    if (parts.length > 0) {
      // 重複があれば除去
      return Array.from(new Set(parts)).join('');
    }

    return data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.warn('地名の逆引きに失敗しました:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
