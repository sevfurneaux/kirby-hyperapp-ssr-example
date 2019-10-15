<?php

return function ($page) {
    return [
        "state" => createState(["notes" => $page->children()->listed()->sortBy('date', 'desc')->toArray(function($note) {
            return [
                "url" => (string)$note->url(),
                "date" => (string)$note->date()->toDate('d F Y'),
                "title" => (string)$note->title()
            ];
        })])
    ];

};
