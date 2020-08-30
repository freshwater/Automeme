
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const fs = require('fs').promises;

let [_n, _s, ...keyValues] = process.argv;

let args = {
    channel: null,
    storeCommentImages: 'false',
    storeCommentHtmlFragments: 'false',
    recordSqlite: 'true',
    dataFolder: 'data',
    sqliteFileName: 'database.sqlite',
    scanTimeSeconds: 7*24*60*60,
    viewportWidth: 1200,
    viewportHeight: 1080,
    deviceScaleFactor: 1
};

for (let i = 0; i < keyValues.length; i += 2) {
    args[keyValues[i].substring(2)] = keyValues[i+1];
}

let {channel, storeCommentImages, storeCommentHtmlFragments, recordSqlite,
     dataFolder, sqliteFileName, scanTimeSeconds, viewportWidth, viewportHeight, deviceScaleFactor} = args;

storeCommentImages = 'true' === storeCommentImages;
storeCommentHtmlFragments = 'true' === storeCommentHtmlFragments;
recordSqlite = 'true' === recordSqlite;
// sqliteFileName = sqliteFileName || `${channel}.sqlite`;
scanTimeSeconds = parseInt(scanTimeSeconds, 10);
viewportWidth = parseInt(viewportWidth, 10);
viewportHeight = parseInt(viewportHeight, 10);
deviceScaleFactor = parseInt(deviceScaleFactor, 10);

console.warn({channel, storeCommentImages, storeCommentHtmlFragments, recordSqlite,
              dataFolder, sqliteFileName, scanTimeSeconds, viewportWidth, viewportHeight, deviceScaleFactor});

dataFolder = '/workfolder/' + dataFolder;


/* ------ */

(async () => {
    await fs.mkdir(dataFolder, { recursive: true });

    if (storeCommentImages) {
        await fs.mkdir(`${dataFolder}/images`, { recursive: true });
    }

    if (recordSqlite) {
        let database = new sqlite3.Database(`${dataFolder}/${sqliteFileName}`);

        database.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id              INTEGER     NOT NULL PRIMARY KEY,
                time            DATETIME    NOT NULL,
                topic           text        NOT NULL,
                channel         text        NOT NULL,
                stream_title    text        NOT NULL,   
                viewer_count    INTEGER     NOT NULL,
                username        text        NOT NULL,
                message_text    text        NOT NULL,
                message_html    text,
                image_id        text
        )`);

        function rowInsert({time, topic, channel, streamTitle, viewerCount, username, messageText, messageHTML, imageId}) {
            database.run(`INSERT INTO messages (time, topic, channel, stream_title, viewer_count,
                                                username, message_text, message_html, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                [time, topic, channel, streamTitle, viewerCount, username, messageText, messageHTML, imageId]);
        }
    }

    let browser = await puppeteer.launch({
        args: ['--no-sandbox']
    });

    let page = await browser.newPage();

    await page.setViewport({
        width: viewportWidth, height: viewportHeight,
        deviceScaleFactor: deviceScaleFactor
    });

    await page.goto(`https://www.twitch.tv/${channel}`);
    await page.waitFor(2000);

    await page.exposeFunction('log', console.log);
    await page.exposeFunction('rowInsert', rowInsert);
    await page.exposeFunction('setConsoleTitle', function (title) {
        let code = String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7);
        process.stdout.write(code);
    });

    const mark = crypto.randomBytes(16).toString('base64').match(/[A-z]/ig).join('');

    await page.exposeFunction('commentSnapshot', async function (snapshotId) {
        let element = await page.$(`[${mark}-snapshot-id='${snapshotId}']`);
        await element.screenshot({path: `${dataFolder}/images/${snapshotId}.png`});
    });

    await page.exposeFunction('chatSnapshot', async function (snapshotId) {
        let element = await page.$('.chat-scrollable-area__message-container');
        await element.screenshot({path: `${dataFolder}/images/${snapshotId}.png`});
    });

    await page.evaluate(async function({mark, storeCommentImages, storeCommentHtmlFragments, recordSqlite}) {
        let channel = document.querySelector('.tw-interactive[href] h1').innerText;
        let topic = document.querySelector('[data-a-target=stream-game-link]').innerText;
        let streamTitle = document.querySelector('[data-a-target=stream-title]').innerText;

        setConsoleTitle(`${channel}.${topic}`);

        /* Attach a DOM observer to the chat container. We mark a comment as read
           by giving it a custom attribute. This lets us query unread comments with a
           simple :not([mark]) selector. */
        let observer = new MutationObserver(function (mutations) {
            let viewerCount = document.querySelector('.tw-animated-number').innerText;
            viewerCount = parseInt(viewerCount.replace(',', ''))

            let scrollbar = document.querySelector('.simplebar-track.vertical');

            if (scrollbar) {
                scrollbar.classList.remove('simplebar-track');
                scrollbar.setAttribute('style', 'visibility: hidden');
            }

            let comments = document.querySelectorAll(`.chat-scrollable-area__message-container .chat-line__message:not([${mark}])`);

            for (let comment of comments) {
                let snapshotId = String(Math.random()).substring(2);

                if (storeCommentImages) {
                    comment.setAttribute(`${mark}-snapshot-id`, snapshotId);
                    commentSnapshot(snapshotId);
                }

                comment.setAttribute(mark, 'true');

                let username = comment.querySelector('.chat-author__display-name').innerText;
                let tokens = comment.querySelectorAll('.chat-line__message--emote, .text-fragment');

                let messageText = Array.from(tokens).map((token) => {
                    if (token.classList.contains('chat-line__message--emote')) {
                        /* Specify how Twitch icons are textified.
                           By default we record the text code that the user typed,
                           which is specified in the alt attribute. */

                        // return '[' + token.getAttribute('alt') + ']';
                        return token.getAttribute('alt');
                    } else if (token.classList.contains('text-fragment')) {
                        return token.innerText;
                    }
                }).join('');

                // log(`${new Date().toISOString()} ${username}: ${messageText}`);
                log(`${username}: ${messageText}`);

                if (recordSqlite) {
                    rowInsert({time: new Date().toISOString(),
                            topic, channel, streamTitle, viewerCount, username, messageText,
                            messageHTML: storeCommentHtmlFragments ? comment.outerHTML : null,
                            imageId: storeCommentImages ? snapshotId : null});
                }
            }
        });


        /* Annotate the start of the log session */

        // page.screenshot({path: `${dataFolder}/images/${mark}-LogBegin.png`});

        let viewerCount = document.querySelector('.tw-animated-number').innerText;
        viewerCount = parseInt(viewerCount.replace(',', ''))

        rowInsert({time: new Date().toISOString(),
                   topic, channel, streamTitle, viewerCount, username: "SYSTEM",
                   messageText: "LogBegin", messageHTML: null, imageId: null});

        let chatContainer = document.querySelector('.chat-scrollable-area__message-container');
        observer.observe(chatContainer, { childList: true });

    }, {mark, storeCommentImages, storeCommentHtmlFragments, recordSqlite});

    await page.waitFor(scanTimeSeconds*1000);

    await page.close();
    await browser.close();
})();
