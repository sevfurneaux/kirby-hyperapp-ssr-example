const { div } = require("@hyperapp/html");
const { home } = require("./components/home");
const { notes } = require("./components/notes");
const { note } = require("./components/note");
const { photography } = require("./components/photography");
const { album } = require("./components/album");

module.exports.view = (state, actions) => {
  return div(renderPage(state));
};

function renderPage(state) {
  switch (state.template) {
    case "home":
      return home();
      break;

    case "notes":
      return notes();
      break;

    case "note":
      return note();
      break;

    case "photography":
      return photography();
      break;

    case "album":
      return album();
      break;

    default:
      return null;
      break;
  }
}
