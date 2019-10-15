const { app } = require("hyperapp");
const { withRender } = require("@hyperapp/render");

const { view } = require("../src/view");
const { actions } = require("../src/app");
const html = require("../src/html");

const initialState = context;

function renderHtml(initialState) {
  const appHtml = withRender(app)(initialState, actions, view);
  return html(appHtml, initialState);
}

console.log(renderHtml(initialState));
