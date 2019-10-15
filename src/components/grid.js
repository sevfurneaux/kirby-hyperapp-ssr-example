const { ul, li } = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");

module.exports.grid = children => state =>
  ul({ class: "grid" }, children.map(child => li(child)));
