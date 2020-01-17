'use strict';

const fsExtra = require('fs-extra');
const gulp = require('gulp');
const electron = require('electron-connect').server.create();
const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const json = require('rollup-plugin-json');
const minify = require('rollup-plugin-minify-es');
const uglify = require('uglify-es').minify;
const cond = require('rollup-plugin-conditional');
const webpack = require('webpack-stream');
const copy = require('rollup-plugin-copy-glob');

const buildBackend = async () => {
  fsExtra.removeSync('backend/dist');

  return gulp.src('backend/src/main.js')
    .pipe(webpack(require('./webpack.config.js')))
    .pipe(gulp.dest('backend/dist/'));
}

let cache;

const buildFrontend = async (options = {}) => {
  if (options.minify) {
    fsExtra.removeSync('frontend/dist');
  }

  const bundle = await rollup.rollup({
    input: {
      'ra-app': 'frontend/src/ra-app.js'
    },
    cache,
    plugins: [
      json(),
      resolve({
        module: true
      }),
      cond(options.minify, [
        minify({
          mangle: { toplevel: true }
        }, uglify),
      ]),
      commonjs(),
      copy([
        { files: 'frontend/src/index.html', dest: 'frontend/dist/'},
        { files: 'frontend/src/fonts/*', dest: 'frontend/dist/fonts/'},
      ])
    ]
  });

  cache = bundle.cache;

  await bundle.write({
    dir: 'frontend/dist',
    format: 'cjs',
    sourcemap: options.minify ? false : 'inline'
  });

  electron.reload();
};

gulp.task('build', buildFrontend);
gulp.task('build-prod', async () => {
  await buildBackend();
  await buildFrontend({ minify: true });
});

gulp.task('serve', async () => {

  await buildFrontend();

  // Start browser process
  electron.start([ '--inspect' ]);

  // Restart browser process
  gulp.watch('backend/src/**/*.js', electron.restart);

  // Reload renderer process
  gulp.watch([ 'frontend/src/**' ], gulp.series([ 'build' ]));
});

gulp.task('dev', () => {
  gulp.watch([ 'frontend/src/**' ], gulp.series([ 'build' ]));
});
