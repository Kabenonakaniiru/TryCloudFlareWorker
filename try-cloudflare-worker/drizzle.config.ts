import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts', // あなたのスキーマファイルのパス
  out: './drizzle',         // マイグレーションファイルの出力先
  dialect: 'sqlite',        // D1はSQLiteベースなので'sqlite'を指定
  url: process.env.DATABASE_URL || 'file:./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/96126f7fb6905b355612acc42576359a8024564985a1a6a934fcbdef8633b3b8.sqlite',
});