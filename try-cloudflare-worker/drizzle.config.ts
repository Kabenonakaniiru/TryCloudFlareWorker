import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts', // あなたのスキーマファイルのパス
  out: './drizzle',         // マイグレーションファイルの出力先
  dialect: 'sqlite',        // D1はSQLiteベースなので'sqlite'を指定
});