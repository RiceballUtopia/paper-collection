import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { X, Check, MapPin, Loader2 } from 'lucide-react';
import { getPlaceNameFromCoordinates } from '../lib/locationUtils';

// Leafletのデフォルトマーカーアイコンが正しく表示されるように設定
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerModalProps {
  initialLat: number | null;
  initialLng: number | null;
  onSelectLocation: (lat: number, lng: number, placeName: string) => void;
  onClose: () => void;
}

// 地図クリックを検知するコンポーネント
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({
  onMapClick,
}) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  initialLat,
  initialLng,
  onSelectLocation,
  onClose,
}) => {
  // 初期位置（未指定の場合は東京駅周辺をデフォルト）
  const defaultPos = {
    lat: initialLat ?? 35.6812,
    lng: initialLng ?? 139.7671,
  };

  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number }>(defaultPos);
  const [placeName, setPlaceName] = useState<string>('読み込み中...');
  const [isLoadingName, setIsLoadingName] = useState(false);

  // マップをクリックした時にピンを移動し、地名を逆引き
  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedPos({ lat, lng });
    setIsLoadingName(true);
    try {
      const name = await getPlaceNameFromCoordinates(lat, lng);
      setPlaceName(name);
    } catch {
      setPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsLoadingName(false);
    }
  };

  // 初回マウント時にも地名を取得
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingName(true);
      const name = await getPlaceNameFromCoordinates(defaultPos.lat, defaultPos.lng);
      if (isMounted) {
        setPlaceName(name);
        setIsLoadingName(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirm = () => {
    onSelectLocation(selectedPos.lat, selectedPos.lng, placeName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full h-[85vh] sm:h-[600px] flex flex-col overflow-hidden mx-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-paper-200 flex items-center justify-between bg-paper-100">
          <div className="flex items-center gap-1.5 text-amber-950 font-bold text-sm">
            <MapPin className="w-4 h-4 text-amber-800" />
            <span>地図で場所を指定</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-paper-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ガイド文 */}
        <div className="bg-amber-50/80 px-4 py-2 border-b border-amber-100 text-xs text-amber-900">
          💡 地図をタップ（クリック）してピンを思い出の場所に移動してください。
        </div>

        {/* 地図コンテナ */}
        <div className="flex-1 relative">
          <MapContainer
            center={[selectedPos.lat, selectedPos.lng]}
            zoom={14}
            className="w-full h-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[selectedPos.lat, selectedPos.lng]} icon={customIcon} />
            <MapClickHandler onMapClick={handleMapClick} />
          </MapContainer>
        </div>

        {/* フッター：地名表示と決定ボタン */}
        <div className="p-4 bg-paper-50 border-t border-paper-200 space-y-3">
          <div className="text-xs text-stone-600">
            <span className="font-semibold text-stone-800">選択した場所: </span>
            {isLoadingName ? (
              <span className="inline-flex items-center gap-1 text-amber-800">
                <Loader2 className="w-3 h-3 animate-spin" /> 地名を取得中...
              </span>
            ) : (
              <span className="text-stone-800 font-medium">{placeName}</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 border border-stone-300 text-stone-700 text-xs font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>この場所を設定</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
