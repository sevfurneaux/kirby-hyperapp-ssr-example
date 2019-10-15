var HyperappSSR = (function () {
'use strict';

function h(name, attributes) {
  var rest = [];
  var children = [];
  var length = arguments.length;

  while (length-- > 2) rest.push(arguments[length]);

  while (rest.length) {
    var node = rest.pop();
    if (node && node.pop) {
      for (length = node.length; length--; ) {
        rest.push(node[length]);
      }
    } else if (node != null && node !== true && node !== false) {
      children.push(node);
    }
  }

  return typeof name === "function"
    ? name(attributes || {}, children)
    : {
        nodeName: name,
        attributes: attributes || {},
        children: children,
        key: attributes && attributes.key
      }
}

function app(state, actions, view, container) {
  var map = [].map;
  var rootElement = (container && container.children[0]) || null;
  var oldNode = rootElement && recycleElement(rootElement);
  var lifecycle = [];
  var skipRender;
  var isRecycling = true;
  var globalState = clone(state);
  var wiredActions = wireStateToActions([], globalState, clone(actions));

  scheduleRender();

  return wiredActions

  function recycleElement(element) {
    return {
      nodeName: element.nodeName.toLowerCase(),
      attributes: {},
      children: map.call(element.childNodes, function(element) {
        return element.nodeType === 3 // Node.TEXT_NODE
          ? element.nodeValue
          : recycleElement(element)
      })
    }
  }

  function resolveNode(node) {
    return typeof node === "function"
      ? resolveNode(node(globalState, wiredActions))
      : node != null
        ? node
        : ""
  }

  function render() {
    skipRender = !skipRender;

    var node = resolveNode(view);

    if (container && !skipRender) {
      rootElement = patch(container, rootElement, oldNode, (oldNode = node));
    }

    isRecycling = false;

    while (lifecycle.length) lifecycle.pop()();
  }

  function scheduleRender() {
    if (!skipRender) {
      skipRender = true;
      setTimeout(render);
    }
  }

  function clone(target, source) {
    var out = {};

    for (var i in target) out[i] = target[i];
    for (var i in source) out[i] = source[i];

    return out
  }

  function setPartialState(path, value, source) {
    var target = {};
    if (path.length) {
      target[path[0]] =
        path.length > 1
          ? setPartialState(path.slice(1), value, source[path[0]])
          : value;
      return clone(source, target)
    }
    return value
  }

  function getPartialState(path, source) {
    var i = 0;
    while (i < path.length) {
      source = source[path[i++]];
    }
    return source
  }

  function wireStateToActions(path, state, actions) {
    for (var key in actions) {
      typeof actions[key] === "function"
        ? (function(key, action) {
            actions[key] = function(data) {
              var result = action(data);

              if (typeof result === "function") {
                result = result(getPartialState(path, globalState), actions);
              }

              if (
                result &&
                result !== (state = getPartialState(path, globalState)) &&
                !result.then // !isPromise
              ) {
                scheduleRender(
                  (globalState = setPartialState(
                    path,
                    clone(state, result),
                    globalState
                  ))
                );
              }

              return result
            };
          })(key, actions[key])
        : wireStateToActions(
            path.concat(key),
            (state[key] = clone(state[key])),
            (actions[key] = clone(actions[key]))
          );
    }

    return actions
  }

  function getKey(node) {
    return node ? node.key : null
  }

  function eventListener(event) {
    return event.currentTarget.events[event.type](event)
  }

  function updateAttribute(element, name, value, oldValue, isSvg) {
    if (name === "key") {
    } else if (name === "style") {
      if (typeof value === "string") {
        element.style.cssText = value;
      } else {
        if (typeof oldValue === "string") oldValue = element.style.cssText = "";
        for (var i in clone(oldValue, value)) {
          var style = value == null || value[i] == null ? "" : value[i];
          if (i[0] === "-") {
            element.style.setProperty(i, style);
          } else {
            element.style[i] = style;
          }
        }
      }
    } else {
      if (name[0] === "o" && name[1] === "n") {
        name = name.slice(2);

        if (element.events) {
          if (!oldValue) oldValue = element.events[name];
        } else {
          element.events = {};
        }

        element.events[name] = value;

        if (value) {
          if (!oldValue) {
            element.addEventListener(name, eventListener);
          }
        } else {
          element.removeEventListener(name, eventListener);
        }
      } else if (
        name in element &&
        name !== "list" &&
        name !== "type" &&
        name !== "draggable" &&
        name !== "spellcheck" &&
        name !== "translate" &&
        !isSvg
      ) {
        element[name] = value == null ? "" : value;
      } else if (value != null && value !== false) {
        element.setAttribute(name, value);
      }

      if (value == null || value === false) {
        element.removeAttribute(name);
      }
    }
  }

  function createElement(node, isSvg) {
    var element =
      typeof node === "string" || typeof node === "number"
        ? document.createTextNode(node)
        : (isSvg = isSvg || node.nodeName === "svg")
          ? document.createElementNS(
              "http://www.w3.org/2000/svg",
              node.nodeName
            )
          : document.createElement(node.nodeName);

    var attributes = node.attributes;
    if (attributes) {
      if (attributes.oncreate) {
        lifecycle.push(function() {
          attributes.oncreate(element);
        });
      }

      for (var i = 0; i < node.children.length; i++) {
        element.appendChild(
          createElement(
            (node.children[i] = resolveNode(node.children[i])),
            isSvg
          )
        );
      }

      for (var name in attributes) {
        updateAttribute(element, name, attributes[name], null, isSvg);
      }
    }

    return element
  }

  function updateElement(element, oldAttributes, attributes, isSvg) {
    for (var name in clone(oldAttributes, attributes)) {
      if (
        attributes[name] !==
        (name === "value" || name === "checked"
          ? element[name]
          : oldAttributes[name])
      ) {
        updateAttribute(
          element,
          name,
          attributes[name],
          oldAttributes[name],
          isSvg
        );
      }
    }

    var cb = isRecycling ? attributes.oncreate : attributes.onupdate;
    if (cb) {
      lifecycle.push(function() {
        cb(element, oldAttributes);
      });
    }
  }

  function removeChildren(element, node) {
    var attributes = node.attributes;
    if (attributes) {
      for (var i = 0; i < node.children.length; i++) {
        removeChildren(element.childNodes[i], node.children[i]);
      }

      if (attributes.ondestroy) {
        attributes.ondestroy(element);
      }
    }
    return element
  }

  function removeElement(parent, element, node) {
    function done() {
      parent.removeChild(removeChildren(element, node));
    }

    var cb = node.attributes && node.attributes.onremove;
    if (cb) {
      cb(element, done);
    } else {
      done();
    }
  }

  function patch(parent, element, oldNode, node, isSvg) {
    if (node === oldNode) {
    } else if (oldNode == null || oldNode.nodeName !== node.nodeName) {
      var newElement = createElement(node, isSvg);
      parent.insertBefore(newElement, element);

      if (oldNode != null) {
        removeElement(parent, element, oldNode);
      }

      element = newElement;
    } else if (oldNode.nodeName == null) {
      element.nodeValue = node;
    } else {
      updateElement(
        element,
        oldNode.attributes,
        node.attributes,
        (isSvg = isSvg || node.nodeName === "svg")
      );

      var oldKeyed = {};
      var newKeyed = {};
      var oldElements = [];
      var oldChildren = oldNode.children;
      var children = node.children;

      for (var i = 0; i < oldChildren.length; i++) {
        oldElements[i] = element.childNodes[i];

        var oldKey = getKey(oldChildren[i]);
        if (oldKey != null) {
          oldKeyed[oldKey] = [oldElements[i], oldChildren[i]];
        }
      }

      var i = 0;
      var k = 0;

      while (k < children.length) {
        var oldKey = getKey(oldChildren[i]);
        var newKey = getKey((children[k] = resolveNode(children[k])));

        if (newKeyed[oldKey]) {
          i++;
          continue
        }

        if (newKey != null && newKey === getKey(oldChildren[i + 1])) {
          if (oldKey == null) {
            removeElement(element, oldElements[i], oldChildren[i]);
          }
          i++;
          continue
        }

        if (newKey == null || isRecycling) {
          if (oldKey == null) {
            patch(element, oldElements[i], oldChildren[i], children[k], isSvg);
            k++;
          }
          i++;
        } else {
          var keyedNode = oldKeyed[newKey] || [];

          if (oldKey === newKey) {
            patch(element, keyedNode[0], keyedNode[1], children[k], isSvg);
            i++;
          } else if (keyedNode[0]) {
            patch(
              element,
              element.insertBefore(keyedNode[0], oldElements[i]),
              keyedNode[1],
              children[k],
              isSvg
            );
          } else {
            patch(element, oldElements[i], null, children[k], isSvg);
          }

          newKeyed[newKey] = children[k];
          k++;
        }
      }

      while (i < oldChildren.length) {
        if (getKey(oldChildren[i]) == null) {
          removeElement(element, oldElements[i], oldChildren[i]);
        }
        i++;
      }

      for (var i in oldKeyed) {
        if (!newKeyed[i]) {
          removeElement(element, oldKeyed[i][0], oldKeyed[i][1]);
        }
      }
    }
    return element
  }
}


var src = Object.freeze({
	h: h,
	app: app
});

function vnode(name) {
  return function (attributes, children) {
    return typeof attributes === "object" && !Array.isArray(attributes)
      ? h(name, attributes, children)
      : h(name, {}, attributes)
  }
}


function a(attributes, children) {
  return vnode("a")(attributes, children)
}

function abbr(attributes, children) {
  return vnode("abbr")(attributes, children)
}

function address(attributes, children) {
  return vnode("address")(attributes, children)
}

function area(attributes, children) {
  return vnode("area")(attributes, children)
}

function article(attributes, children) {
  return vnode("article")(attributes, children)
}

function aside(attributes, children) {
  return vnode("aside")(attributes, children)
}

function audio(attributes, children) {
  return vnode("audio")(attributes, children)
}

function b(attributes, children) {
  return vnode("b")(attributes, children)
}

function bdi(attributes, children) {
  return vnode("bdi")(attributes, children)
}

function bdo(attributes, children) {
  return vnode("bdo")(attributes, children)
}

function blockquote(attributes, children) {
  return vnode("blockquote")(attributes, children)
}

function br(attributes, children) {
  return vnode("br")(attributes, children)
}

function button(attributes, children) {
  return vnode("button")(attributes, children)
}

function canvas(attributes, children) {
  return vnode("canvas")(attributes, children)
}

function caption(attributes, children) {
  return vnode("caption")(attributes, children)
}

function cite(attributes, children) {
  return vnode("cite")(attributes, children)
}

function code(attributes, children) {
  return vnode("code")(attributes, children)
}

function col(attributes, children) {
  return vnode("col")(attributes, children)
}

function colgroup(attributes, children) {
  return vnode("colgroup")(attributes, children)
}

function data(attributes, children) {
  return vnode("data")(attributes, children)
}

function datalist(attributes, children) {
  return vnode("datalist")(attributes, children)
}

function dd(attributes, children) {
  return vnode("dd")(attributes, children)
}

function del(attributes, children) {
  return vnode("del")(attributes, children)
}

function details(attributes, children) {
  return vnode("details")(attributes, children)
}

function dfn(attributes, children) {
  return vnode("dfn")(attributes, children)
}

function dialog(attributes, children) {
  return vnode("dialog")(attributes, children)
}

function div(attributes, children) {
  return vnode("div")(attributes, children)
}

function dl(attributes, children) {
  return vnode("dl")(attributes, children)
}

function dt(attributes, children) {
  return vnode("dt")(attributes, children)
}

function em(attributes, children) {
  return vnode("em")(attributes, children)
}

function embed(attributes, children) {
  return vnode("embed")(attributes, children)
}

function fieldset(attributes, children) {
  return vnode("fieldset")(attributes, children)
}

function figcaption(attributes, children) {
  return vnode("figcaption")(attributes, children)
}

function figure(attributes, children) {
  return vnode("figure")(attributes, children)
}

function footer(attributes, children) {
  return vnode("footer")(attributes, children)
}

function form(attributes, children) {
  return vnode("form")(attributes, children)
}

function h1(attributes, children) {
  return vnode("h1")(attributes, children)
}

function h2(attributes, children) {
  return vnode("h2")(attributes, children)
}

function h3(attributes, children) {
  return vnode("h3")(attributes, children)
}

function h4(attributes, children) {
  return vnode("h4")(attributes, children)
}

function h5(attributes, children) {
  return vnode("h5")(attributes, children)
}

function h6(attributes, children) {
  return vnode("h6")(attributes, children)
}

function header(attributes, children) {
  return vnode("header")(attributes, children)
}

function hr(attributes, children) {
  return vnode("hr")(attributes, children)
}

function i(attributes, children) {
  return vnode("i")(attributes, children)
}

function iframe(attributes, children) {
  return vnode("iframe")(attributes, children)
}

function img(attributes, children) {
  return vnode("img")(attributes, children)
}

function input(attributes, children) {
  return vnode("input")(attributes, children)
}

function ins(attributes, children) {
  return vnode("ins")(attributes, children)
}

function kbd(attributes, children) {
  return vnode("kbd")(attributes, children)
}

function label(attributes, children) {
  return vnode("label")(attributes, children)
}

function legend(attributes, children) {
  return vnode("legend")(attributes, children)
}

function li(attributes, children) {
  return vnode("li")(attributes, children)
}

function main(attributes, children) {
  return vnode("main")(attributes, children)
}

function map(attributes, children) {
  return vnode("map")(attributes, children)
}

function mark(attributes, children) {
  return vnode("mark")(attributes, children)
}

function menu(attributes, children) {
  return vnode("menu")(attributes, children)
}

function menuitem(attributes, children) {
  return vnode("menuitem")(attributes, children)
}

function meter(attributes, children) {
  return vnode("meter")(attributes, children)
}

function nav(attributes, children) {
  return vnode("nav")(attributes, children)
}

function object(attributes, children) {
  return vnode("object")(attributes, children)
}

function ol(attributes, children) {
  return vnode("ol")(attributes, children)
}

function optgroup(attributes, children) {
  return vnode("optgroup")(attributes, children)
}

function option(attributes, children) {
  return vnode("option")(attributes, children)
}

function output(attributes, children) {
  return vnode("output")(attributes, children)
}

function p(attributes, children) {
  return vnode("p")(attributes, children)
}

function param(attributes, children) {
  return vnode("param")(attributes, children)
}

function pre(attributes, children) {
  return vnode("pre")(attributes, children)
}

function progress(attributes, children) {
  return vnode("progress")(attributes, children)
}

function q(attributes, children) {
  return vnode("q")(attributes, children)
}

function rp(attributes, children) {
  return vnode("rp")(attributes, children)
}

function rt(attributes, children) {
  return vnode("rt")(attributes, children)
}

function rtc(attributes, children) {
  return vnode("rtc")(attributes, children)
}

function ruby(attributes, children) {
  return vnode("ruby")(attributes, children)
}

function s(attributes, children) {
  return vnode("s")(attributes, children)
}

function samp(attributes, children) {
  return vnode("samp")(attributes, children)
}

function section(attributes, children) {
  return vnode("section")(attributes, children)
}

function select(attributes, children) {
  return vnode("select")(attributes, children)
}

function small(attributes, children) {
  return vnode("small")(attributes, children)
}

function source(attributes, children) {
  return vnode("source")(attributes, children)
}

function span(attributes, children) {
  return vnode("span")(attributes, children)
}

function strong(attributes, children) {
  return vnode("strong")(attributes, children)
}

function sub(attributes, children) {
  return vnode("sub")(attributes, children)
}

function summary(attributes, children) {
  return vnode("summary")(attributes, children)
}

function sup(attributes, children) {
  return vnode("sup")(attributes, children)
}

function svg(attributes, children) {
  return vnode("svg")(attributes, children)
}

function table(attributes, children) {
  return vnode("table")(attributes, children)
}

function tbody(attributes, children) {
  return vnode("tbody")(attributes, children)
}

function td(attributes, children) {
  return vnode("td")(attributes, children)
}

function textarea(attributes, children) {
  return vnode("textarea")(attributes, children)
}

function tfoot(attributes, children) {
  return vnode("tfoot")(attributes, children)
}

function th(attributes, children) {
  return vnode("th")(attributes, children)
}

function thead(attributes, children) {
  return vnode("thead")(attributes, children)
}

function time(attributes, children) {
  return vnode("time")(attributes, children)
}

function tr(attributes, children) {
  return vnode("tr")(attributes, children)
}

function track(attributes, children) {
  return vnode("track")(attributes, children)
}

function u(attributes, children) {
  return vnode("u")(attributes, children)
}

function ul(attributes, children) {
  return vnode("ul")(attributes, children)
}

function video(attributes, children) {
  return vnode("video")(attributes, children)
}

function wbr(attributes, children) {
  return vnode("wbr")(attributes, children)
}



var require$$0 = Object.freeze({
	a: a,
	abbr: abbr,
	address: address,
	area: area,
	article: article,
	aside: aside,
	audio: audio,
	b: b,
	bdi: bdi,
	bdo: bdo,
	blockquote: blockquote,
	br: br,
	button: button,
	canvas: canvas,
	caption: caption,
	cite: cite,
	code: code,
	col: col,
	colgroup: colgroup,
	data: data,
	datalist: datalist,
	dd: dd,
	del: del,
	details: details,
	dfn: dfn,
	dialog: dialog,
	div: div,
	dl: dl,
	dt: dt,
	em: em,
	embed: embed,
	fieldset: fieldset,
	figcaption: figcaption,
	figure: figure,
	footer: footer,
	form: form,
	h1: h1,
	h2: h2,
	h3: h3,
	h4: h4,
	h5: h5,
	h6: h6,
	header: header,
	hr: hr,
	i: i,
	iframe: iframe,
	img: img,
	input: input,
	ins: ins,
	kbd: kbd,
	label: label,
	legend: legend,
	li: li,
	main: main,
	map: map,
	mark: mark,
	menu: menu,
	menuitem: menuitem,
	meter: meter,
	nav: nav,
	object: object,
	ol: ol,
	optgroup: optgroup,
	option: option,
	output: output,
	p: p,
	param: param,
	pre: pre,
	progress: progress,
	q: q,
	rp: rp,
	rt: rt,
	rtc: rtc,
	ruby: ruby,
	s: s,
	samp: samp,
	section: section,
	select: select,
	small: small,
	source: source,
	span: span,
	strong: strong,
	sub: sub,
	summary: summary,
	sup: sup,
	svg: svg,
	table: table,
	tbody: tbody,
	td: td,
	textarea: textarea,
	tfoot: tfoot,
	th: th,
	thead: thead,
	time: time,
	tr: tr,
	track: track,
	u: u,
	ul: ul,
	video: video,
	wbr: wbr
});

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var classnames = createCommonjsModule(function (module) {
/*!
  Copyright (c) 2017 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg) && arg.length) {
				var inner = classNames.apply(null, arg);
				if (inner) {
					classes.push(inner);
				}
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if ('object' !== 'undefined' && module.exports) {
		classNames.default = classNames;
		module.exports = classNames;
	} else if (typeof undefined === 'function' && typeof undefined.amd === 'object' && undefined.amd) {
		// register as 'classnames', consistent with npm package name
		undefined('classnames', [], function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());
});

const { nav: nav$1, a: a$1 } = require$$0;


var menu_1 = () => (state, actions) =>
  nav$1(
    { id: "menu", class: "menu" },
    Object.keys(state.navigation).map(key =>
      a$1(
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

var menu$1 = {
	menu: menu_1
};

const { header: header$1, a: a$2 } = require$$0;
const { menu: menu$2 } = menu$1;

var header_2 = () => (state, actions) =>
  header$1({ class: "header" }, [
    a$2(
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
    menu$2()
  ]);

var header_1 = {
	header: header_2
};

const { footer: footer$1, a: a$3, nav: nav$2 } = require$$0;

var footer_2 = () => state =>
  footer$1({ class: "footer" }, [
    a$3(
      { href: state.site.url },
      `\u00A9 ${new Date().getFullYear()} ${state.site.title}`
    )
  ]);

var footer_1 = {
	footer: footer_2
};

const { div: div$1 } = require$$0;
const { header: header$2 } = header_1;
const { footer: footer$2 } = footer_1;

var page_1 = children =>
  div$1({ class: "page" }, [header$2(), children, footer$2()]);

var page = {
	page: page_1
};

const { header: header$3, h1: h1$1 } = require$$0;

var intro_1 = () => state =>
  header$3({ class: "intro" }, h1$1(state.page.content.title));

var intro = {
	intro: intro_1
};

const { ul: ul$1, li: li$1 } = require$$0;

var grid_1 = children => state =>
  ul$1({ class: "grid" }, children.map(child => li$1(child)));

var grid = {
	grid: grid_1
};

const {
  main: main$1,
  div: div$2,
  a: a$4,
  img: img$1,
  figure: figure$1,
  figcaption: figcaption$1,
  span: span$1
} = require$$0;
const { page: page$2 } = page;
const { intro: intro$2 } = intro;
const { grid: grid$1 } = grid;

var home_1 = () => (state, actions) =>
  page$2(
    main$1([
      intro$2(),
      grid$1(
        Object.keys(state.photography).map(album => [
          a$4(
            {
              href: state.photography[album].url,
              onclick: element => {
                element.preventDefault();
                actions.fetchPage(`${state.photography[album].url}.json`);
              }
            },
            figure$1([
              state.photography[album].cover &&
                img$1({ src: state.photography[album].cover }),
              figcaption$1([
                span$1([
                  span$1(
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

var home = {
	home: home_1
};

const { main: main$2, header: header$4, h2: h2$1, div: div$3, article: article$1, a: a$5, time: time$1 } = require$$0;
const { page: page$3 } = page;
const { intro: intro$3 } = intro;

var notes_1 = () => (state, actions) => {
  return page$3(
    main$2([
      intro$3(),
      div$3(
        { class: "notes" },
        Object.keys(state.notes).map(note =>
          article$1(
            { class: "note" },
            header$4(
              { class: "note-header" },
              a$5(
                {
                  href: state.notes[note].url,
                  onclick: element => {
                    element.preventDefault();
                    actions.fetchPage(`${state.notes[note].url}.json`);
                  }
                },
                [h2$1(state.notes[note].title), time$1(state.notes[note].date)]
              )
            )
          )
        )
      )
    ])
  );
};

var notes = {
	notes: notes_1
};

const { main: main$3, article: article$2, header: header$5, h1: h1$2 } = require$$0;
const { page: page$4 } = page;

var note_1 = () => state =>
  page$4(
    main$3([
      article$2({ class: "note" }, [
        header$5({ class: "note-header intro" }, h1$2(state.page.content.title))
      ])
    ])
  );

var note = {
	note: note_1
};

const {
  main: main$4,
  div: div$4,
  a: a$6,
  img: img$2,
  figure: figure$2,
  figcaption: figcaption$2,
  span: span$2,
  ul: ul$2,
  li: li$2
} = require$$0;
const { page: page$5 } = page;
const { intro: intro$5 } = intro;

var photography_1 = () => (state, actions) => {
  return page$5(
    main$4([
      intro$5(),
      ul$2(
        { class: "albums", "data-even": state.isEven },
        Object.keys(state.photography).map(album => [
          li$2([
            a$6(
              {
                href: state.photography[album].url,
                onclick: element => {
                  element.preventDefault();
                  actions.fetchPage(`${state.photography[album].url}.json`);
                }
              },
              figure$2([
                state.photography[album].cover &&
                  img$2({ src: state.photography[album].cover }),
                figcaption$2(state.photography[album].title)
              ])
            )
          ])
        ])
      )
    ])
  );
};

var photography = {
	photography: photography_1
};

const { main: main$5, article: article$3, header: header$6, figure: figure$3, img: img$3 } = require$$0;
const { page: page$6 } = page;

var album_1 = () => state =>
  page$6(
    main$5({ class: "album" }, [
      article$3([
        header$6([figure$3({ class: "album-cover" }, img$3({ src: state.cover }))])
      ])
    ])
  );

var album = {
	album: album_1
};

const { div: div$5 } = require$$0;
const { home: home$1 } = home;
const { notes: notes$1 } = notes;
const { note: note$1 } = note;
const { photography: photography$1 } = photography;
const { album: album$1 } = album;

var view_1 = (state, actions) => {
  return div$5(renderPage(state));
};

function renderPage(state) {
  switch (state.template) {
    case "home":
      return home$1();
      break;

    case "notes":
      return notes$1();
      break;

    case "note":
      return note$1();
      break;

    case "photography":
      return photography$1();
      break;

    case "album":
      return album$1();
      break;

    default:
      return null;
      break;
  }
}

var view = {
	view: view_1
};

var actions = {
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

var app$1 = {
	actions: actions
};

const { app: app$2 } = src;
const { view: view$1 } = view;
const { actions: actions$1 } = app$1;

const PARSED_INITIAL_STATE = JSON.parse(decodeURI(INITIAL_STATE));

const application = app$2(
  PARSED_INITIAL_STATE,
  actions$1,
  view$1,
  document.getElementById("app")
);

window.addEventListener("popstate", event => {
  if (event.state) {
    application.setActivePage(event.state);
  }
});

var browser = {

};

return browser;

}());
