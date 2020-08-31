
# Memecatcher

Memecatcher is a utility for observing and saving Twitch chat to sqlite files. The intended use case is data analysis.

## Motivation

Twitch chat was invented in the early days of the internet. Over the years, its importance has grown. It is a misunderstood medium, an ephemeral hivemind, an enlightenend condensate of wills and frustrations. I believe there is a deep beauty to Twitch chat, one that can only be seen through the analytically clairvoyant mind's eye of deep artificial machine general learning intelligence IoT.

## Use

    ./scan.sh --channelName <channel>

Docker is the only dependency. `scan.sh` builds a Docker image, which may take a few minutes to run the first time, and instantiates a throwaway container in which it runs headless Chrome and a Puppeteer script to perform the actual observations. The system assumes a channel is live.

By default, data is stored in `data/database.sqlite` in the `messages` table. The columns are:

| id | time | topic | channel | stream_title | viewer_count | username | message_text | message_html | image_id
|-|-|-|-|-|-|-|-|-|-|

#  

## Record images of comments:

    ./scan.sh --channelName <channel> --storeCommentImages true

Images are stored in `data/images`. On channels with a high power level, chat may scroll so fast that our technology is continuously bamboozled in its attempts to capture accurate images. This may depend on your computer hardware. It's possible to solve this using a more complex capture mechanism, which is currently not implemented. This only really affects the very popular channels which get over 9000e-3 comments per second.

## Other examples

If you want to just look at the chat in the comfort of your terminal:

    ./scan.sh --channelName <channel> --recordSqlite false

Write to a text file for line-based logging:

    ./scan.sh --channelName <channel> --recordSqlite false >> file.txt

Observe 20 seconds of comments:

    !./scan.sh --channel <channel> --scanTimeSeconds 20 --recordSqlite false


Store retina DPI images:

    ./scan.sh --channelName <channel> --deviceScaleFactor 2

Write to a specific sqlite file:

    ./scan.sh --channelName <channel> --dataFolder mydata --sqliteFileName myfile.sqlite

See `examples.ipynb` for example analysis.