var gulp = require('gulp');
var typescript = require('gulp-typescript');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');

gulp.task('compile', function() {
    gulp.src('ts/**/*.ts').pipe(typescript()).pipe(gulp.dest('ts'))
});

gulp.task('copy', ['copy-js', 'copy-css']);

gulp.task('copy-js', function() {
    gulp.src([
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/popper.js/dist/popper.min.js',
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/howler/dist/howler.min.js',
        'node_modules/matter-js/build/matter.min.js',
        'node_modules/pixi.js/dist/pixi.min.js'
    ]).pipe(gulp.dest('wwwroot'));
});

gulp.task('copy-css', function() {
    gulp.src([
        'node_modules/bootstrap/dist/css/bootstrap.min.css'
    ]).pipe(gulp.dest('wwwroot'));
});

gulp.task('compress', ['compile'], function () {
    gulp.src('./ts/**/*.js')
        .pipe(uglify())
        .pipe(concat('flappy.min.js'))
        .pipe(gulp.dest('./wwwroot/'));
});

gulp.task('sass', function () {
    gulp.src('./sass/**/*.{sass,scss}')
        .pipe(sass())
        .pipe(concat('style.css'))
        .pipe(gulp.dest('./wwwroot/'));
});

gulp.task('watch', function() {
    gulp.watch('ts/*.ts', ['compile', 'compress']);
    gulp.watch('sass/*.{sass,scss}', ['sass']);
});

gulp.task('default', ['copy', 'compile', 'compress', 'sass']);
