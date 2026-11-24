import exifr from 'exifr';

export interface ExifExtractionResult {
  date: string; // 'YYYY-MM-DD'
  dateSource: 'exif' | 'file' | 'today';
  dateSourceLabel: string;
  gps?: {
    lat: number;
    lng: number;
  };
}

/**
 * 元の写真ファイル（加工・圧縮前）から EXIF メタデータを抽出します。
 * 優先順位: ① EXIF DateTimeOriginal -> ② File lastModified -> ③ 今日の日付
 */
export async function extractExifInfo(file: File): Promise<ExifExtractionResult> {
  try {
    // exifr で撮影日時とGPS情報を取得
    const output = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });

    // 1. 撮影日時の判定
    let targetDate: Date | null = null;
    let dateSource: 'exif' | 'file' | 'today' = 'today';
    let dateSourceLabel = '今日の日付を設定しました';

    if (output?.DateTimeOriginal instanceof Date && !isNaN(output.DateTimeOriginal.getTime())) {
      targetDate = output.DateTimeOriginal;
      dateSource = 'exif';
      dateSourceLabel = '写真の撮影日時から自動入力しました';
    } else if (output?.CreateDate instanceof Date && !isNaN(output.CreateDate.getTime())) {
      targetDate = output.CreateDate;
      dateSource = 'exif';
      dateSourceLabel = '写真の作成日時から自動入力しました';
    } else if (file.lastModified) {
      const fileDate = new Date(file.lastModified);
      // 異常値や未来日付でないかチェック
      if (!isNaN(fileDate.getTime())) {
        targetDate = fileDate;
        dateSource = 'file';
        dateSourceLabel = 'ファイルの更新日時から自動入力しました';
      }
    }

    if (!targetDate) {
      targetDate = new Date();
      dateSource = 'today';
      dateSourceLabel = '今日の日付を設定しました';
    }

    // YYYY-MM-DD 形式にフォーマット（ローカルタイムゾーン考慮）
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 2. GPS情報の判定
    let gps: { lat: number; lng: number } | undefined = undefined;
    if (output?.latitude && output?.longitude) {
      gps = {
        lat: output.latitude,
        lng: output.longitude,
      };
    }

    return {
      date: dateStr,
      dateSource,
      dateSourceLabel,
      gps,
    };
  } catch (error) {
    console.warn('EXIF読み込みに失敗しました:', error);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      dateSource: 'today',
      dateSourceLabel: '今日の日付を設定しました',
    };
  }
}
