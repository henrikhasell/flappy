var gulp = require('gulp');
var typescript = require('gulp-typescript');

gulp.task('compile', function() {
    gulp.src('*.ts').pipe(typescript()).pipe(gulp.dest('wwwroot'))
});

gulp.task('copy', function() {
    gulp.src([
        'node_modules/howler/dist/howler.min.js',
        'node_modules/matter-js/build/matter.min.js',
        'node_modules/pixi.js/dist/pixi.min.js'
    ]).pipe(gulp.dest('wwwroot'));
});

gulp.task('watch', function() {
    gulp.watch('*.ts', function() {
        gulp.start('compile');
    });
});

gulp.task('default', ['copy', 'compile']);