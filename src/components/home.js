const {
  main,
  div,
  a,
  img,
  figure,
  figcaption,
  span
} = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");
const { grid } = require("./grid");

module.exports.home = () => (state, actions) =>
  page(
    main([
      intro(),
      grid(
        Object.keys(state.photography).map(album => [
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
              figcaption([
                span([
                  span(
                    { class: "example-name" },
                    state.photography[album].title
                  )
                ])
              ])
            ])
          )
        ])
      )
    ])
  );
