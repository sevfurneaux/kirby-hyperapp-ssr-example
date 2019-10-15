const { nav, a } = require("@hyperapp/html");
const classNames = require("classnames");

module.exports.menu = () => (state, actions) =>
  nav(
    { id: "menu", class: "menu" },
    Object.keys(state.navigation).map(key =>
      a(
        {
          href: state.navigation[key].url,
          "aria-current":
            state.navigation[key].url === state.page.url ? "page" : null,
          onclick: element => {
            element.preventDefault();
            actions.fetchPage(`${state.navigation[key].url}.json`);
          }
        },
        state.navigation[key].title
      )
    )
  );
