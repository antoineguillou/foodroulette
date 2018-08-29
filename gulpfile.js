/**
 * include plug-ins
 */
var gulp         = require('gulp');
var changed      = require('gulp-changed');
var imagemin     = require('gulp-imagemin');
var concat       = require('gulp-concat-multi');
var stripDebug   = require('gulp-strip-debug');
var uglify       = require('gulp-uglify');
var sass         = require('gulp-sass');
var notify       = require('gulp-notify');
var cleanCSS     = require('gulp-clean-css');
var sourcemaps   = require('gulp-sourcemaps');
var rename       = require('gulp-rename');
var watch        = require('gulp-watch');
var gutil        = require('gulp-util');
var del          = require('del');
var inject       = require('gulp-inject');
var spritesmith  = require('gulp.spritesmith');
var imageResize  = require('gulp-image-resize');
var autoprefixer = require('gulp-autoprefixer');
var browserSync  = require('browser-sync').create();
var reload       = browserSync.reload;

/**
 * Path
 */
var name_theme  = 'foodroulette';
var domaine     = 'foodroulette.test';
var src_theme   = './src/' + name_theme + '/';
var src_sass    = './src/sass/';
var src_cron    = './src/cron/';
var dist_theme  = './dist/';
var dist_cron   = './cron/';
var src_js      = src_theme + 'js/';
var src_js_libs = src_js + 'libs/';
var path = {
    src : {
        img     : src_theme + 'img/**/*',
        sprite  : [
            {
                dir         : src_theme + 'img-sprite/',
                imgName     : 'sprite',
                cssName     : '_sprite.scss',
                retinaSuffix: '@2x',
                imgPathCss  : 'img/',
            },
        ],
        php     : src_theme + '**/*.php',
        cron    : [
            src_cron + '**/*.php',
            src_cron + '**/.gitkeep',
        ],
        html    : src_theme + '**/*.html',
        scripts : [
            {
                path  : src_js_libs,
                files : {
                    'modernizr-2.7.1.min.js' : [
                        src_js_libs + 'modernizr-2.7.1.min.js',
                    ]
                },
                in_footer: 'false',
            },
            {
                path  : src_js,
                files : {
                    'script.js' : [
                        src_js_libs + '**/*.js',
                        '!' + src_js_libs + 'modernizr-2.7.1.min.js',
                        src_js + 'script.js',
                        src_js + 'sw.js',
                    ]
                }
            },
        ],
        scss   : src_sass + '**/*.scss',
        divers : [
            src_theme + 'fonts/**/*',
            src_theme + 'videos/**/*',
            src_theme + 'favicon*',
            src_theme + 'android-chrome-*',
            src_theme + 'apple-touch-icon*',
            src_theme + 'browserconfig.*',
            src_theme + 'manifest*',
            src_theme + 'mstile-*',
            src_theme + 'safari-pinned-tab*',
            src_theme + 'fonts/**/*',
            src_theme + 'humans.txt',
            src_theme + 'sitemap.xml',
            src_theme + '**/.gitkeep',
        ],
    },
    dist : {
        img     : dist_theme + 'img/',
        php     : dist_theme,
        cron    : dist_cron,
        html    : dist_theme,
        scripts : [
            dist_theme + 'js/libs/',
            dist_theme + 'js/',
        ],
        scss    : dist_theme,
        divers  : dist_theme,
    }
}

function generationPage( src, dist ){

    gulp.src( src )

        // @todo : ajouter ici vos injection JS
        .pipe( injectCustom( 0, 'html' ) )
        .pipe( injectCustom( 0, 'php' ) )
        .pipe( injectCustom( 1, 'html' ) )
        .pipe( injectCustom( 1, 'php' ) )

        .pipe( changed( dist ) )
        .pipe( gulp.dest( dist ) )
        .pipe( reload({stream: true}) );
}

/**
 * TASKS
 */

// Browser Sync
gulp.task('browser-sync', function() {
    browserSync.init({
        proxy: domaine,
        host: domaine,
        open: 'external'
    });
});

// HTML
gulp.task('htmlpage', function() {
    generationPage( path.src.html, path.dist.html )
});

// PHP
gulp.task('phppage', function() {
    generationPage( path.src.php, path.dist.php )
});

// CRON
gulp.task('cron', function() {
    generationPage( path.src.cron, path.dist.cron )
});

// minify new images
gulp.task('imagemin', function() {
  gulp.src( path.src.img )
    .pipe(changed( path.dist.img ))
     .pipe(imagemin({
          progressive: true,
          optimizationLevel: 7
      }))
    .pipe(gulp.dest( path.dist.img ))
    .pipe( reload({stream: true}) );
});

// JS concat, strip debugging and minify
gulp.task('scripts', function() {
    for( var i in path.src.scripts ){
        for( var j in path.src.scripts[ i ][ 'files' ] ){
            if( gutil.env.type === 'production' ){
                concat( path.src.scripts[ i ][ 'files' ] )
                    .pipe( stripDebug() )
                    .pipe( uglify() )
                    .pipe( gulp.dest( path.dist.scripts[ i ] ) )
                    .pipe( reload({stream: true}) );
            } else {
                base = path.src.scripts[ i ][ 'path' ];
                gulp.src( path.src.scripts[ i ][ 'files' ][ j ], { base: path.src.scripts[ i ][ 'path' ] } )
                    .pipe( gulp.dest( path.dist.scripts[ i ] ) )
                    .pipe( reload({stream: true}) );
            }
        }
    }
});

gulp.task('styles', function() {
    gulp.src(path.src.scss)
        .pipe(sass().on('error', notify.onError({
            message: "Error: <%= error.message %>",
            title: "Error running something"})))
        .pipe( autoprefixer({browsers: ['Firefox >= 40', 'IE >= 10']}) )
        .pipe( sourcemaps.init() )
        .pipe( cleanCSS() )
        .pipe( sourcemaps.write('./') )
        .pipe( gulp.dest(path.dist.scss ) )
        .pipe( reload({stream: true}) );
});

// Tâche de création de sprite
gulp.task('resizeToNonRetina', function() {
    for( var i in path.src.sprite ){
        var task = gulp.src( path.src.sprite[ i ].dir + '*' + path.src.sprite[ i ].retinaSuffix + '.png' )
            .pipe(imageResize({
                width: '50%',
                height: '50%',
                upscale: true,
            }))
            .pipe(rename(function(path) {
                path.basename = path.basename.slice(0, -3);  //remove @2x label
            }))
            .pipe(gulp.dest(path.src.sprite[ i ].dir));
    }
    return task;
});

// Tâche de création de sprite
gulp.task('sprite', ['resizeToNonRetina'], function() {

    for( var i in path.src.sprite ){

        // Use all normal and `-2x` (retina) images as `src`
        //   e.g. `github.png`, `github-2x.png`
        var retinaImgName = path.src.sprite[ i ].imgName + path.src.sprite[ i ].retinaSuffix + '.png';
        var spriteData = gulp.src(path.src.sprite[ i ].dir + '*.png')
                .pipe(spritesmith({
                    // Filter out `-2x` (retina) images to separate spritesheet
                    retinaSrcFilter: path.src.sprite[ i ].dir + '*' + path.src.sprite[ i ].retinaSuffix + '.png',
                    // Generate a normal and a `-2x` (retina) spritesheet
                    imgName: path.src.sprite[ i ].imgName + '.png',
                    retinaImgName: retinaImgName,
                    // Chemin à utiliser dans le fichier CSS
                    imgPath: path.src.sprite[ i ].imgPathCss + path.src.sprite[ i ].imgName + '.png',
                    retinaImgPath: path.src.sprite[ i ].imgPathCss + retinaImgName,
                    cssName: path.src.sprite[ i ].cssName,
                    algorithm: 'binary-tree',
                    cssVarMap: function(sprite) {
                        sprite.name = 'sprite-' + sprite.name
                    }
                }));

        // Deliver spritesheets to `dist/` folder as they are completed
        spriteData.img.pipe(gulp.dest(src_theme + 'img/'));

        // Deliver CSS to `./` to be imported by `index.scss`
        spriteData.css.pipe(gulp.dest(src_sass));

    }

});

// Copier-coller
gulp.task( 'divers', function() {
    gulp.src( path.src.divers, { base: src_theme } )
        .pipe(changed( path.dist.divers ))
        .pipe( gulp.dest( path.dist.divers ) )
        .pipe( reload({stream: true}) );
});

// Clean du dist
gulp.task( 'clean_all', function() {
    return del( [ dist_cron + '**/*', dist_theme + '**/*', '!' + dist_theme + '.htaccess' ] )
});
gulp.task( 'reset', [ 'clean_all' ], function(){
    gulp.start( 'default' );
});
gulp.task( 'clean', function() {
    return del( [ dist_cron + '**/*.php', dist_theme + '**/*.php', dist_theme + '**/*.html', dist_theme + '**/*.js', dist_theme + '**/*.css', dist_theme + '**/*.css.map' ] );
});


// default gulp task
gulp.task('default', [ 'clean', 'imagemin' ], function() {

    gulp.start( 'styles' );
    gulp.start( 'htmlpage' );
    gulp.start( 'phppage' );
    gulp.start( 'cron' );
    gulp.start( 'scripts' );
    gulp.start( 'divers' );
    gulp.start( 'browser-sync' );

    // watch for SCSS changes
    watch( path.src.scss, function() {
        gulp.start( 'styles' );
    });

    // watch for HTML changes
    watch( path.src.html, function() {
        gulp.start( 'htmlpage' );
    });

    // watch for PHP changes
    watch( path.src.php, function() {
        gulp.start( 'phppage' );
    });

    // watch for CRON
    watch( path.src.cron, function() {
        gulp.start( 'cron' );
    });

    // watch for scripts changes
    for( var i in path.src.scripts ){
        for( var j in path.src.scripts[ i ][ 'files' ] ){
            watch( path.src.scripts[ i ][ 'files' ][ j ], function() {
                gulp.start( 'scripts' );
            });
        }
    }

    // watch for images changes
    watch( path.src.img, function() {
        gulp.start( 'imagemin' );
    });

    // watch for sprite changes
    for( var i in path.src.sprite ){
        watch( path.src.sprite[ i ].dir + '*' + path.src.sprite[ i ].retinaSuffix + '.png', function() {
            gulp.start( 'sprite' );
        });
    }

    // watch for divers
    watch( path.src.divers, function() {
        gulp.start( 'divers' );
    });

});


/**
 * Functions
 */
function injectCustom( index, type ){
    for( var j in path.src.scripts[ index ][ 'files' ] ){
        if( 'html' == type )
            return inject(
                gulp.src( ( gutil.env.type === 'production' ? path.src.scripts[ index ][ 'path' ] + j : path.src.scripts[ index ][ 'files' ][ j ] ), { read: false } ),
                {
                    starttag: ( path.src.scripts[ index ][ 'html_starttag' ] ) ? path.src.scripts[ index ][ 'html_starttag' ][ 0 ] : '<!-- ' + j + ':{{ext}} -->',
                    endtag: ( path.src.scripts[ index ][ 'html_starttag' ] ) ? path.src.scripts[ index ][ 'html_starttag' ][ 1 ] : '<!-- endinject -->',
                    transform: function( filepath ){
                        filepath = filepath.substring( filepath.lastIndexOf( name_theme ) + name_theme.length );
                        return inject.transform.apply( inject.transform, arguments );
                    }
                }
            );
        else
            return inject(
                gulp.src( ( gutil.env.type === 'production' ? path.src.scripts[ index ][ 'path' ] + j : path.src.scripts[ index ][ 'files' ][ j ] ), { read: false } ),
                {
                    starttag: '// inject:' + j + ':{{ext}}',
                    endtag: '// endinject',
                    transform: function( filepath ){
                        filepath = filepath.substring( filepath.lastIndexOf( name_theme ) + name_theme.length );
                        return inject.transform.apply( inject.transform, arguments );
                    }
                });
    }
}
