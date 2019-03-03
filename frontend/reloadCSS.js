(function () {
  const wsUrl = `$WS_URL`;
  const ws = new WebSocket(wsUrl);

  const styles = {};

  const createStyle = () => {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    document.head.insertBefore(style, null);
    return style;
  };


  ws.addEventListener('open', (e) => {
    console.log(`WebSocket ${wsUrl} open`)
  });

  ws.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    for (let { file, contents } of data) {
      if (!styles[file]) {
        styles[file] = createStyle();
      }
      styles[file].innerText = contents;
    }
  });
})();
