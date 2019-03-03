gulp-proxy-inject-css
==============

Gulp plugin that allows to open any website on localhost and inject your custom CSS that will be applied to page on each save without page reload, much like live reload, but without having to have site hosted locally. This is most useful for developing UserCSS for third-party sites.

**This plugin is a quick and dirty solution to a very specific problem, there are a lot of plugins that do much more and much better. Unless you are developing UserCSS for third-party website, this might be not a plugin you are looking for.**

## Installation

`$ npm install --save-dev gulp-proxy-inject-css`

## Usage

cssInject() creates proxy server at http://localhost:8080 and returns function that creates file stream for pipeline that notifies script in browser via websocket on each change of CSS file.

```js
import gulp from 'gulp';
import cssInject from 'gulp-proxy-inject-css';
import sass from 'gulp-sass';
import sourcemaps from 'gulp-sourcemaps';

const inject = cssInject('habr.com');

export const styles = () => {
  return gulp.src('sass/**/*.scss', {since: gulp.lastRun(styles)})
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'))
    .pipe(inject());
};


export const watch = () => {
  return gulp.watch('sass/**/*.scss', { ignoreInitial: false }, styles);
};
```

## Options

Default proxy server listens at http://localhost:8080/ and websocket at ws://localhost:8081/reload

Key | Type | Default | Description
--- | --- | --- | ---
`target` | String | | Target website to proxy, i.e. `github.com`
`options` | Object | | Plugin options
`options.port` | Number | `8080` | Proxy server port
`options.host` | String | `localhost` | Proxy server host
`https` | Boolean | `true` | Whether or not target site uses HTTPS
`wsPort` | String | `8081` | Websocket server port
`wsHost` | String | `localhost` | Websocket server host
`wsPath` | String | `/reload` | Websocket server path
`open` | Boolean | `true` | Whether or not to open proxy in browser automatically
`proxyOpts` | Object | `{}` | Additional options to pass to [http-proxy-middleware](https://www.npmjs.com/package/http-proxy-middleware), if needed

## License

[MIT](https://github.com/3lo1i/gulp-proxy-inject-css/blob/master/LICENSE)
