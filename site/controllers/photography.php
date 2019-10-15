<?php

return function ($page) {
    return [
        "state" => createState([
            "isEven" => $page->children()->listed()->isEven(),
            "photography" => $page->children()->listed()->toArray(function($album) {
                return [
                    "url" => $album->url(),
                    "cover" => $album->cover() ? $album->cover()->resize(800, 1000)->url() : null,
                    "title" => $album->title()->value()
                ];
        })])
    ];

};
