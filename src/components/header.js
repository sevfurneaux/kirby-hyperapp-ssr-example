const { header, a } = require("@hyperapp/html");
const { menu } = require("./menu");

module.exports.header = () => (state, actions) =>
  header({ class: "header" }, [
    a(
      {
        class: "logo",
        href: state.site.url,
        onclick: element => {
          element.preventDefault();
          actions.fetchPage("/home.json");
        }
      },
      state.site.title
    ),
    menu()
  ]);
