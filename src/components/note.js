const { main, article, header, h1 } = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");

module.exports.note = () => state =>
  page(
    main([
      article({ class: "note" }, [
        header({ class: "note-header intro" }, h1(state.page.content.title))
      ])
    ])
  );
