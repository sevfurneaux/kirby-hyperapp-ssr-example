const { main, header, h2, div, article, a, time } = require("@hyperapp/html");
const { page } = require("./page");
const { intro } = require("./intro");

module.exports.notes = () => (state, actions) => {
  return page(
    main([
      intro(),
      div(
        { class: "notes" },
        Object.keys(state.notes).map(note =>
          article(
            { class: "note" },
            header(
              { class: "note-header" },
              a(
                {
                  href: state.notes[note].url,
                  onclick: element => {
                    element.preventDefault();
                    actions.fetchPage(`${state.notes[note].url}.json`);
                  }
                },
                [h2(state.notes[note].title), time(state.notes[note].date)]
              )
            )
          )
        )
      )
    ])
  );
};
