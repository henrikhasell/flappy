var gulp = require('gulp');
var typescript = require('gulp-typescript');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

gulp.task('compile', function() {
    gulp.src('ts/**/*.ts').pipe(typescript()).pipe(gulp.dest('ts'))
});

gulp.task('copy', function() {
    gulp.src([
        'node_modules/howler/dist/howler.min.js',
        'node_modules/matter-js/build/matter.min.js',
        'node_modules/pixi.js/dist/pixi.min.js'
    ]).pipe(gulp.dest('wwwroot'));
});

gulp.task('watch', function() {
    gulp.watch('ts/*.ts', function() {
        gulp.start(['compile', 'compress']);
    });
});

gulp.task('compress', ['compile'], function () {
    return gulp.src('./ts/**/*.js')
        .pipe(uglify())
        .pipe(concat('flappy.min.js'))
        .pipe(gulp.dest('./wwwroot/'));
  });

gulp.task('default', ['copy', 'compile', 'compress']);