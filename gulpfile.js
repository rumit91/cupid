// This a modified version of the gulp file that the yo generator 'node-typescript' privides.

var gulp = require('gulp');
var ts = require('gulp-typescript');
var replace = require('gulp-replace');
var tslint = require('gulp-tslint');
var exec = require('child_process').exec;
var jasmine = require('gulp-jasmine');
var gulp = require('gulp-help')(gulp);
var tsconfig = require('gulp-tsconfig-files');
var path = require('path');
var inject = require('gulp-inject');
var gulpSequence = require('gulp-sequence');
var del = require('del');
var file = require('gulp-file');
var nconf = require('nconf');

var deployLocation = '../MichelleTimurCupid-deploy/';

var typeDefsPath = (function (tsd) {
  return tsd.path || 'typings';
})(require('./tsd.json'));

var tsFilesGlob = (function (c) {
  return c.filesGlob || c.files || '**/*.ts';
})(require('./tsconfig.json'));

gulp.task('tsconfig_files', 'Update files section in tsconfig.json', function () {
  gulp.src(tsFilesGlob).pipe(tsconfig());
});

gulp.task('gen_tsrefs', 'Generates the app.d.ts references file dynamically for all application *.ts files', function () {
  var target = gulp.src(path.join('.', typeDefsPath, 'app.d.ts'));
  var sources = gulp.src([path.join('.', 'src', '**', '*.ts')], { read: false });
  return target.pipe(inject(sources, {
    starttag: '//{',
    endtag: '//}',
    transform: function (filepath) {
      return '/// <reference path="..' + filepath + '" />';
    }
  })).pipe(gulp.dest(path.join('.', typeDefsPath)));
});

gulp.task('clean', 'Cleans the generated js files from lib directory', function () {
  return del([
    'lib/**/*'
  ]);
});

gulp.task('tslint', 'Lints all TypeScript source files', function () {
  /*return gulp.src(tsFilesGlob)
    .pipe(tslint())
    .pipe(tslint.report('verbose'));*/
});

gulp.task('_build', 'INTERNAL TASK - Compiles all TypeScript source files', function (cb) {
  var tsSrc = tsFilesGlob;
  tsSrc.push(typeDefsPath);
  return gulp.src(tsSrc)
    .pipe(ts({module: 'commonjs'})).js.pipe(gulp.dest('lib'));
      /*exec('tsc.cmd', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });*/
});

gulp.task('views', function () {
    return gulp.src('./src/views/*')
        .pipe(gulp.dest('./lib/views/'));
});

gulp.task('copy-config', function () {
    return gulp.src('./config.json')
        .pipe(gulp.dest('./lib/'));
});

gulp.task('copy-messages', function () {
    return gulp.src('./messages.json')
        .pipe(gulp.dest('./lib/'));
});

//run tslint task, then run _tsconfig_files and _gen_tsrefs in parallel, then run _build
gulp.task('build', 'Compiles all TypeScript source files and updates module references', function(callback) {
    gulpSequence('views', 'tslint', ['tsconfig_files', 'gen_tsrefs'], '_build')(callback)
});

gulp.task('test', 'Runs the Jasmine test specs', ['build'], function () {
  return gulp.src('test/*.js')
    .pipe(jasmine());
});

gulp.task('_replace', function () {
   return gulp.src(deployLocation + '*')
    .pipe(replace('nconf.get(\'fbAppId\')', 'process.env.fbAppId'))
    .pipe(replace('nconf.get(\'fbAppSecret\')', 'process.env.fbAppSecret'))
    .pipe(replace('nconf.get(\'googleApiKey\')', 'process.env.googleApiKey'))
    .pipe(gulp.dest(deployLocation));
});

gulp.task('watch', function() {
    gulp.watch([tsFilesGlob, './src/views/*'], ['build', 'copy-config', 'copy-messages']);
});

gulp.task('default', ['build', 'watch']);

gulp.task('_build-deploy', 'INTERNAL TASK - Compiles all TypeScript source files', function (cb) {
  var tsSrc = tsFilesGlob;
  tsSrc.push(typeDefsPath);
  return gulp.src(tsSrc)
    .pipe(ts({module: 'commonjs'})).js.pipe(gulp.dest(deployLocation));
});

gulp.task('views-deploy', function () {
    return gulp.src('./src/views/*')
        .pipe(gulp.dest(deployLocation + 'views/'));
});

gulp.task('copy-messages-deploy', function () {
    return gulp.src('./messages.json')
        .pipe(gulp.dest('./deploy/'));
});

gulp.task('copy-config-deploy', function () {
    nconf.file({ file: './config.json' });           
    var user = nconf.get('user');
    var config = {
        baseUrl: 'http://valentino.azurewebsites.net',
        user: user
    }
    return file('config.json', JSON.stringify(config))
        .pipe(gulp.dest(deployLocation));
});

gulp.task('copy-package-json-deploy', function () {
    return gulp.src('./package.json')
        .pipe(gulp.dest(deployLocation));
});

gulp.task('deploy', 'Compiles all TypeScript source files and updates module references', function(callback) {
    gulpSequence('views-deploy', 'tslint', ['tsconfig_files', 'gen_tsrefs'], '_build-deploy', '_replace', 
                 'copy-package-json-deploy', 'copy-messages-deploy', 'copy-config-deploy')(callback)
});
