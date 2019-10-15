const { footer, a, nav } = require("@hyperapp/html");

module.exports.footer = () => state =>
  footer({ class: "footer" }, [
    a(
      { href: state.site.url },
      `\u00A9 ${new Date().getFullYear()} ${state.site.title}`
    )
  ]);
