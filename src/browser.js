const { app } = require("hyperapp");
const { view } = require("./view");
const { actions } = require("./app");

const PARSED_INITIAL_STATE = JSON.parse(decodeURI(INITIAL_STATE));

const application = app(
  PARSED_INITIAL_STATE,
  actions,
  view,
  document.getElementById("app")
);

window.addEventListener("popstate", event => {
  if (event.state) {
    application.setActivePage(event.state);
  }
});
