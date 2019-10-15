<?php

return function ($page) {
    return [
        "state" => createState(["photography" => page('photography')->children()->listed()->toArray(function($album) {
            return [
                "url" => $album->url(),
                "cover" => $album->cover() ? $album->cover()->resize(1024, 1024)->url() : null,
                "title" => $album->title()->value()
            ];
        })])
    ];

};
