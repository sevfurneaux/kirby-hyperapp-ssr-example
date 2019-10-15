module.exports = (content, initialState = {}) => {
  return `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${initialState.site.content.title} | ${
    initialState.page.content.title
  }</title>
  ${initialState.css}
  <link href="/assets/css/index.css" rel="stylesheet">
  <link href="/assets/css/templates/home.css" rel="stylesheet">
  <link href="/assets/css/templates/notes.css" rel="stylesheet">
  <link href="/assets/css/templates/photography.css" rel="stylesheet">
  </head>
  <body>
    <main id="app">
      ${content}
    </main>
    <script>const INITIAL_STATE = "${encodeURI(
      JSON.stringify(initialState)
    )}"</script>
    <script src="assets/js/browser.js"></script>
  </body>
  </html>`;
};
