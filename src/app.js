module.exports.actions = {
  setTitle: title => state => ({
    page: Object.assign({}, state.page, {
      content: Object.assign({}, state.page.content, {
        title: title
      })
    })
  }),
  fetchPage: pageUrl => (state, actions) => {
    fetch(pageUrl, {
      method: "GET"
    })
      .then(response => response.json())
      .then(response => {
        actions.setActivePage(response);
        actions.setHistoryState(response);
      });
  },
  setActivePage: response => () => response,
  setHistoryState: response => () => {
    window.history.pushState(
      response,
      response.page.content.title,
      response.page.url
    );
  }
};
