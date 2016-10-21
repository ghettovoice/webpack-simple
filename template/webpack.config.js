const webpack = require('webpack');
const path = require('path');
const glob = require('glob');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const chalk = require('chalk');
const WebpackNotifierPlugin = require('webpack-notifier');
const packageJson = require('./package.json');

// define global constants
const DEV = process.env.NODE_ENV === 'development';
const VERBOSE = process.argv.includes('--verbose');
const PROFILE = process.argv.includes('--profile');
const MINIFY = process.argv.includes('--minify');
const GLOBALS = {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
    __DEV__: DEV
};
const AUTOPREFIXER_BROWSERS = [
    'last 2 versions'
    // 'Android >= 4.3',
    // 'Chrome >= 45',
    // 'Firefox >= 43',
    // 'Explorer >= 10',
    // 'iOS >= 8.4',
    // 'Opera >= 12',
    // 'Safari >= 9'
];

// webpack variables
var bundleName = 'bundle';
const devHost = 'localhost';
const devPort = 8080;
const nodeModulesDir = path.join(__dirname, 'node_modules');
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'dist');
const entry = path.join(srcDir, 'index.ts');
// for standalone components building
const exportName = '';
const externals = {
    "vue": "Vue"
};
const banner = `
${packageJson.description}.

@package ${packageJson.name}
@author ${packageJson.author}
@version ${packageJson.version}
@licence ${packageJson.license}
@copyright (c) 2016, ${packageJson.author}`;

// webpack plugins setup
const plugins = [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin(GLOBALS),
    new webpack.EnvironmentPlugin([
        "NODE_ENV"
    ]),
    new ProgressBarPlugin({
        format: ' build ' + chalk.magenta.bold(`[${packageJson.name}]`) + ' ' + chalk.cyan.bold('[:bar]') +
                ' ' + chalk.green.bold(':percent') + ' (:elapsed seconds)'
    }),
    new WebpackNotifierPlugin({
        title: packageJson.name,
        alwaysNotify: false
    })
];

if (DEV) {
    plugins.push(
        new webpack.NoErrorsPlugin(),
        new webpack.dependencies.LabeledModulesPlugin()
    );
} else {
    if (MINIFY) {
        bundleName += '.min';

        plugins.push(
            new webpack.optimize.UglifyJsPlugin({
                comments: false,
                mangle: true,
                compress: {
                    warnings: VERBOSE
                },
                output: {
                    preamble: `/*!\n${banner}\n*/`
                }
            })
        );
    }

    plugins.push(
        new webpack.BannerPlugin(banner),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.AggressiveMergingPlugin(),
        new ExtractTextPlugin(`${bundleName}.css`, {
            allChunks: true
        })
    );
}

// postsCSS bundler
const postcss = bundler => ([
    require('postcss-import')({ addDependencyTo: bundler }),
    require('precss')(),
    require('autoprefixer')({ browsers: AUTOPREFIXER_BROWSERS })
]);

// todo add HtmlWebpackPlugin

module.exports = {
    devtool: DEV ? '#cheap-module-eval-source-map' : '#source-map',
    devServer: {
        contentBase: __dirname,
        historyApiFallback: true,
        host: devHost,
        port: devPort
    },
    cache: DEV,
    profile: PROFILE,
    debug: DEV,
    entry: entry,
    // uncomment this for standalone component building
    // externals: externals,
    output: {
        path: outDir,
        filename: `${bundleName}.js`,
        publicPath: DEV ? `http://${devHost}:${devPort}/dist/` : '/dist/',
        crossOriginLoading: "anonymous",
        // uncomment this for standalone component building
        // library: exportName,
        // libraryTarget: 'umd'
    },
    resolve: {
        root: [ nodeModulesDir ],
        extensions: [ '', '.tsx', '.ts', '.jsx', '.js', '.json', '.scss', '.css' ],
        alias: {
            'vue$': 'vue/dist/vue'
        }
    },
    plugins: plugins,
    module: {
        loaders: [ {
            test: /\.vue$/,
            exclude: [ outDir, nodeModulesDir ],
            loader: 'vue'
        }, {
            test: /\.tsx?$/,
            exclude: [ outDir, nodeModulesDir ],
            loader: 'babel!ts'
        }, {
            test: /\.jsx?$/,
            exclude: [ outDir, nodeModulesDir ],
            loader: 'babel'
        }, {
            test: /\.html?$/,
            loader: 'vue-html'
        }, {
            test: /\.json$/i,
            loader: 'json'
        }, {
            test: /\.txt$/i,
            loader: 'raw'
        }, {
            test: /\.(eot|ttf|woff2?|png|jpe?g|gif)$/,
            loader: 'url?limit=10000&name=assets/[name].[ext]?[hash:7]'
        }, ...styleLoaders({
            sourceMap: true,
            extract: !DEV
        }) ],
        preLoaders: [ {
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            test: /\.js$/,
            loader: "source-map"
        } ]
    },
    vue: {
        loaders: Object.assign({
            // instruct vue-loader to load TypeScript
            ts: 'babel!vue-ts'
        }, cssLoaders({
            sourceMap: true,
            extract: !DEV
        })),
        // make TS' generated code cooperate with vue-loader
        esModule: true,
        minimize: MINIFY,
        postcss
    },
    postcss
};

//---------------------------------------------------------------------------------------------
// Helpers
//---------------------------------------------------------------------------------------------
// https://github.com/vuejs-templates/webpack/blob/master/template/build/utils.js
function cssLoaders(options = {}) {
    // generate loader string to be used with extract text plugin
    function generateLoaders(loaders) {
        var sourceLoader = loaders.map(function (loader) {
            var extraParamChar;

            if (/\?/.test(loader)) {
                loader = loader.replace(/\?/, '-loader?');
                extraParamChar = '&'
            } else {
                loader = loader + '-loader';
                extraParamChar = '?'
            }

            return loader + (options.sourceMap ? extraParamChar + 'sourceMap' : '')
        }).join('!');

        // Extract CSS when that option is specified
        // (which is the case during production build)
        if (options.extract) {
            return ExtractTextPlugin.extract('vue-style-loader', sourceLoader)
        } else {
            return [ 'vue-style-loader', sourceLoader ].join('!')
        }
    }

    // http://vuejs.github.io/vue-loader/configurations/extract-css.html
    return {
        css: generateLoaders([ 'css' ]),
        postcss: generateLoaders([ 'css' ]),
        less: generateLoaders([ 'css', 'less' ]),
        sass: generateLoaders([ 'css', 'sass?indentedSyntax' ]),
        scss: generateLoaders([ 'css', 'sass' ]),
        stylus: generateLoaders([ 'css', 'stylus' ]),
        styl: generateLoaders([ 'css', 'stylus' ])
    }
}

// https://github.com/vuejs-templates/webpack/blob/master/template/build/utils.js
// Generate loaders for standalone style files (outside of .vue)
function styleLoaders(options) {
    var output = [];
    var loaders = cssLoaders(options);

    for (var extension in loaders) {
        var loader = loaders[ extension ];
        output.push({
            test: new RegExp('\\.' + extension + '$'),
            loader: loader
        })
    }

    return output
}
