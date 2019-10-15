const { header, h1 } = require("@hyperapp/html");

module.exports.intro = () => state =>
  header({ class: "intro" }, h1(state.page.content.title));
