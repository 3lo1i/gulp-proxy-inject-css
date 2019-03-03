const zlib = require('zlib');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const proxy = require('http-proxy-middleware');
const spy = require('through2-spy');
const opn = require('opn');
const path = require('path');


const escapeRegex = (str) => {
  const regExpSyntaxCharacter = /[\^$\\.*+?()[\]{}|]/g;
  return str.replace(regExpSyntaxCharacter, '\\$&');
};


const headInsertBeforeEnd = (injectString) => {
  return (str) => str.replace('</head>', `${ injectString }</head>`);
};


const replaceAbsoluteUrls = (host) => {
  host = escapeRegex(host);
  const regex = new RegExp(`href="https?\:\/\/${host}\/?(.*)?"`, 'ig');
  const repl = 'href="/$1"';
  return (str) => str.replace(regex, repl);
};


const proxyMutator = (mutatorsList) => {
  return (proxyRes, req, res) => {
  let body = Buffer.alloc(0);
    proxyRes.on('data', function (data) {
      body = Buffer.concat([body, data]);
    });
    proxyRes.on('end', function () {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      const isGizp = proxyRes.headers['content-encoding'] === 'gzip';
      const isHTML = proxyRes.headers['content-type'] &&
        proxyRes.headers['content-type'].includes('text/html');
      if (isHTML) {
        const bodyString = isGizp ? zlib.gunzipSync(body).toString() : body.toString();
        let modifyedBody = bodyString;
        for (let mutatorFunc of mutatorsList) {
          modifyedBody = mutatorFunc(modifyedBody);
        }
        const newBody = isGizp ? zlib.gzipSync(modifyedBody) : modifyedBody;
        res.write(newBody);
      } else {
        res.write(body);
      }
      res.end();
    });
  };
};


module.exports = (target,
  { port, host, https, wsPort, wsHost, wsPath, open, proxyOpts } =
    {
      port: 8080,
      host: 'localhost',
      https: true,
      wsPort: 8081,
      wsHost: 'localhost',
      wsPath: '/reload',
      open: true,
      proxyOpts: {},
    }) => {
  const url = `http://${host}:${port}`;
  const wsUrl = `ws://${wsHost}:${wsPort}${wsPath}`;
  const templatePath = path.join(__dirname, 'frontend', 'reloadCSS.js');
  const template = fs.readFileSync(templatePath, 'utf8');
  const injectScript = template.replace('$WS_URL', wsUrl);
  const injectString = `<script type="text/javascript">${injectScript}</script>`;
  const mutatorsList = [
    replaceAbsoluteUrls(target),
    headInsertBeforeEnd(injectString),
  ];

  const prot = https ? 'https' : 'http';
  const defaultProxyOptions = {
    target: `${prot}://${target}`,
    changeOrigin: true,
    autoRewrite: true,
    followRedirects: true,
    protocolRewrite: 'http',
    selfHandleResponse: true,
    onProxyRes: proxyMutator(mutatorsList),
  };

  const proxyOptions = Object.assign(defaultProxyOptions, proxyOpts);

  const app = express();
  app.use('/', proxy(proxyOptions));
  app.listen(port, host, () => console.log(`Proxy for ${target} listening on port ${port}`));
  
  console.log(wsUrl);
  const wss = new WebSocket.Server({
    host: wsHost,
    port: wsPort,
    path: wsPath,
  }, _ => {});

  const styles = {};

  wss.on('connection', ws => {
    console.log(`WS: new client connected, sending current CSS files`);
    const data = Object.entries(styles)
      .map(([file, contents]) => ({ file, contents }));
    wss.clients.forEach((client) => {
      if (client === ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  wss.on('error', err => {
    console.error(err);
  });

  const broadcast = (data) => {
    console.log(`WS: ${data.file} updated, sending to ${wss.clients.length} client(s)`);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  const spyCallback = (file) => {
    if (file.extname === '.css') {
      styles[file.relative] = file.contents.toString()
      broadcast([
        {
          file: file.relative,
          contents: file.contents.toString(),
        }
      ]);
    }
  };

  if (open) {
    opn(url);
  }

  const streamSpy = () => spy.obj(spyCallback);

  return streamSpy;
};
