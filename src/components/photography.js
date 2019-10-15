const {
  main,
  div,
  a,
  img,
  figure,
  figcaption,
  span,
  ul,
  li
} = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");

module.exports.photography = () => (state, actions) => {
  return page(
    main([
      intro(),
      ul(
        { class: "albums", "data-even": state.isEven },
        Object.keys(state.photography).map(album => [
          li([
            a(
              {
                href: state.photography[album].url,
                onclick: element => {
                  element.preventDefault();
                  actions.fetchPage(`${state.photography[album].url}.json`);
                }
              },
              figure([
                state.photography[album].cover &&
                  img({ src: state.photography[album].cover }),
                figcaption(state.photography[album].title)
              ])
            )
          ])
        ])
      )
    ])
  );
};
