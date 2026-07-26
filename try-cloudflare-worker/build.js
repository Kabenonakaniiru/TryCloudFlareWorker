// build.js
const esbuild = require('esbuild');

const options = {
  entryPoints: [
    'src/client/admin.ts',
    'src/client/groups.ts',
    'src/client/rules.ts',
    'src/client/styles/common.css',
    'src/client/styles/admin.css',
    'src/client/styles/index.css',
    'src/client/styles/groups.css',
    'src/client/styles/rules.css'
  ],
  bundle: true,
  outdir: 'public/dist/client',
  minify: process.env.NODE_ENV === 'production',
  loader: { '.css': 'css' },
};

// 引数に '--watch' があれば監視モードで起動
if (process.argv.includes('--watch')) {
  esbuild.context(options).then(ctx => ctx.watch());
} else {
  esbuild.build(options);
}