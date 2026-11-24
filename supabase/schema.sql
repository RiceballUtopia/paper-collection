-- ==============================================================================
-- 旅印 (Tabijirushi) / 旧: 紙ものコレクション
-- Supabase セットアップ & マイグレーション SQL
-- ==============================================================================

-- 1. items テーブルの作成
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('stamp', 'ticket', 'other')),
    title TEXT NOT NULL,
    memo TEXT,
    image_path TEXT NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    place_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 既存データの 'letter' を 'other' に移行
UPDATE public.items SET type = 'other' WHERE type = 'letter';

-- CHECK 制約の更新（'stamp', 'ticket', 'other' のみ許可）
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE public.items ADD CONSTRAINT items_type_check CHECK (type IN ('stamp', 'ticket', 'other'));

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS items_user_id_idx ON public.items(user_id);
CREATE INDEX IF NOT EXISTS items_taken_at_idx ON public.items(taken_at DESC);

-- 2. ロールに対するスキーマとテーブルの権限付与（GRANT）
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.items TO authenticated;

-- 3. Row Level Security (RLS) の有効化
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 4. items テーブルのRLSポリシー
DROP POLICY IF EXISTS "Users can view their own items" ON public.items;
CREATE POLICY "Users can view their own items"
    ON public.items FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own items" ON public.items;
CREATE POLICY "Users can insert their own items"
    ON public.items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
CREATE POLICY "Users can update their own items"
    ON public.items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;
CREATE POLICY "Users can delete their own items"
    ON public.items FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Storage バケットの作成 (非公開バケット: paper-items)
INSERT INTO storage.buckets (id, name, public)
VALUES ('paper-items', 'paper-items', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage の RLS ポリシー設定
DROP POLICY IF EXISTS "Users can upload their own paper items" ON storage.objects;
CREATE POLICY "Users can upload their own paper items"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'paper-items' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can view their own paper items" ON storage.objects;
CREATE POLICY "Users can view their own paper items"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'paper-items' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own paper items" ON storage.objects;
CREATE POLICY "Users can update their own paper items"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'paper-items' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own paper items" ON storage.objects;
CREATE POLICY "Users can delete their own paper items"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'paper-items' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
