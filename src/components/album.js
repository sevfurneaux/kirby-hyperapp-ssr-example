const { main, article, header, figure, img } = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");

module.exports.album = () => state =>
  page(
    main({ class: "album" }, [
      article([
        header([figure({ class: "album-cover" }, img({ src: state.cover }))])
      ])
    ])
  );
