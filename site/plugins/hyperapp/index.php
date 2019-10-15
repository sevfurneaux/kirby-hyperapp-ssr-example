<?php

use Spatie\Ssr\Renderer;
use Spatie\Ssr\Engines\Node;

function createState($state) {
    return array_merge($state, [
        "site" => site()->toArray(),
        "css" => css(['assets/css/index.css', '@auto']),
        "page" => page()->toArray(),
        "template" => page()->template()->name(),
        "navigation" => site()->children()->listed()->toArray(function($item) {
            return [
                "title" => (string)$item->title(),
                "url" => (string)$item->url()
            ];
        })
    ]);
}

function hyperapp($state) {
    $engine = new Node('/usr/local/bin/node', 'tmp');
    $renderer = new Renderer($engine);

    return $renderer
        ->entry($_SERVER['DOCUMENT_ROOT'] . '/src/main.js')
        ->context($state)
        ->debug(true)
        ->fallback('<main id="app"></main>')
        ->render();
}
