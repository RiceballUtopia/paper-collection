import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PaperType, PAPER_TYPE_LABELS } from '../types';
import { compressImage } from '../lib/imageUtils';
import { getCurrentLocation, getPlaceNameFromCoordinates } from '../lib/locationUtils';
import { ImageCropper } from '../components/ImageCropper';
import { LocationPickerModal } from '../components/LocationPickerModal';
import {
  Camera,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Crop,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';

export const AddItemPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 写真のファイル・切り抜き用ステート
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // フォーム入力ステート（初期値は「スタンプ」）
  const [type, setType] = useState<PaperType>('stamp');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [takenDate, setTakenDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // 位置情報ステート
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // 保存処理のステート
  const [isSaving, setIsSaving] = useState(false);
  const [saveStepMessage, setSaveStepMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ファイル入力の参照（カメラ用・ギャラリー用）
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setLat(loc.lat);
      setLng(loc.lng);
      const name = await getPlaceNameFromCoordinates(loc.lat, loc.lng);
      setPlaceName(name);
    } catch (err: any) {
      setLocationError(err.message || '位置情報を取得できませんでした。');
    } finally {
      setIsLocating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setIsCropping(true);
    e.target.value = '';
  };

  const handleCropComplete = (blob: Blob, url: string) => {
    setCroppedBlob(blob);
    setPreviewUrl(url);
    setIsCropping(false);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    if (!previewUrl) {
      setRawImageSrc(null);
    }
  };

  const handleLocationSelected = (selectedLat: number, selectedLng: number, selectedName: string) => {
    setLat(selectedLat);
    setLng(selectedLng);
    setPlaceName(selectedName);
    setLocationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!croppedBlob) {
      setErrorMessage('写真を選択または撮影してください。');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('タイトルを入力してください。');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      setSaveStepMessage('写真を圧縮しています...');
      const compressedFile = await compressImage(croppedBlob);

      setSaveStepMessage('写真をクラウドに保存しています...');
      const fileId = crypto.randomUUID();
      const filePath = `${user.id}/${fileId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('paper-items')
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`画像の保存に失敗しました: ${uploadError.message}`);
      }

      setSaveStepMessage('記録を保存しています...');
      const takenDateTime = new Date(`${takenDate}T12:00:00Z`).toISOString();

      const { error: dbError } = await supabase.from('items').insert({
        user_id: user.id,
        type,
        title: title.trim(),
        memo: memo.trim() || null,
        image_path: filePath,
        taken_at: takenDateTime,
        lat,
        lng,
        place_name: placeName,
      });

      if (dbError) {
        await supabase.storage.from('paper-items').remove([filePath]);
        throw new Error(`データの保存に失敗しました: ${dbError.message}`);
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '保存中にエラーが発生しました。');
    } finally {
      setIsSaving(false);
      setSaveStepMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-amber-950">
            紙ものを追加する
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            記念のスタンプやチケットの写真をきれいに残しましょう。
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 写真選択 & プレビュー */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
          写真 <span className="text-red-500">*</span>
        </label>

        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-paper-300 bg-paper-100 shadow-sm group">
            <img
              src={previewUrl}
              alt="プレビュー"
              className="w-full max-h-72 object-contain mx-auto bg-stone-900/5"
            />
            <div className="absolute bottom-2 left-2 right-2 flex justify-end gap-2 bg-black/40 backdrop-blur p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setIsCropping(true)}
                className="px-3 py-1.5 bg-white/90 hover:bg-white text-stone-800 text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs transition-colors"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>切り抜き直す</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-3 py-1.5 bg-white/90 hover:bg-white text-stone-800 text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>写真を変える</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-800/30 hover:border-amber-800/60 bg-amber-50/50 hover:bg-amber-50 rounded-2xl transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-950">カメラで撮影</span>
              <span className="text-[10px] text-stone-500 mt-0.5">その場でパシャリ</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-paper-300 hover:border-paper-400 bg-white/60 hover:bg-white rounded-2xl transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-paper-200 text-stone-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-stone-800">アルバムから選ぶ</span>
              <span className="text-[10px] text-stone-500 mt-0.5">保存済みの写真</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 種類選択（スタンプ / 半券・チケット / その他 の3択） */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            種類 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PAPER_TYPE_LABELS) as PaperType[]).map((t) => {
              const isSelected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                    isSelected
                      ? 'border-amber-800 bg-amber-800 text-white shadow-xs font-bold'
                      : 'border-paper-200 bg-white/70 text-stone-700 hover:bg-paper-100'
                  }`}
                >
                  {PAPER_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 上野の森美術館 入場券、京都の記念スタンプ"
            required
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
          />
        </div>

        {/* 日付 */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            受け取った日 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={takenDate}
              onChange={(e) => setTakenDate(e.target.value)}
              required
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
            />
          </div>
        </div>

        {/* 場所 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700">
              受け取った場所（地図用）
            </label>
            {lat && lng && (
              <button
                type="button"
                onClick={() => {
                  setLat(null);
                  setLng(null);
                  setPlaceName(null);
                }}
                className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>位置を削除</span>
              </button>
            )}
          </div>

          <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-800 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {isLocating ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-800">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>現在地を調べています...</span>
                  </div>
                ) : placeName ? (
                  <div>
                    <p className="text-xs font-bold text-stone-800 truncate">
                      {placeName}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      緯度: {lat?.toFixed(4)}, 経度: {lng?.toFixed(4)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    {locationError || '場所が設定されていません'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="flex-1 py-1.5 px-2 bg-paper-100 hover:bg-paper-200 text-stone-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>地図で場所を選ぶ</span>
              </button>

              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isLocating}
                className="py-1.5 px-3 bg-paper-100 hover:bg-paper-200 text-stone-700 text-xs font-medium rounded-lg transition-colors"
              >
                現在地を取得
              </button>
            </div>
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            メモ <span className="text-[10px] font-normal text-stone-400">（任意）</span>
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="誰と行ったか、展示の感想、旅の思い出など..."
            rows={3}
            className="w-full px-3.5 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700 resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || !croppedBlob || !title.trim()}
            className="w-full py-3 px-4 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{saveStepMessage || '保存中...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>手帖に保存する</span>
              </>
            )}
          </button>
        </div>
      </form>

      {isCropping && rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {isMapModalOpen && (
        <LocationPickerModal
          initialLat={lat}
          initialLng={lng}
          onSelectLocation={handleLocationSelected}
          onClose={() => setIsMapModalOpen(false)}
        />
      )}
    </div>
  );
};
