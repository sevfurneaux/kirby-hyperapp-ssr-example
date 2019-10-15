<?php

return function ($page) {
    return [
        "state" => createState([
            "cover" => $page->cover() ? $page->cover()->crop(1024, 768)->url() : null,
        ])
    ];

};
