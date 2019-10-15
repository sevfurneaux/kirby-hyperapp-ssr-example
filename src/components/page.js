const { div } = require("@hyperapp/html");
const { header } = require("./header");
const { footer } = require("./footer");

module.exports.page = children =>
  div({ class: "page" }, [header(), children, footer()]);
