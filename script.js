
const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const fs = require('fs').promises;

const dataFolder = '/workfolder/data';

var [_n, _s, channel] = process.argv;
console.log(channel);

fs.mkdir(`${dataFolder}/images`, { recursive: true });


/* ------ */

var database = new sqlite3.Database(`/workfolder/${channel}.sqlite`);

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
    message_html    text        NOT NULL,
    image_id        text
)`)

function rowInsert({time, topic, channel, streamTitle, viewerCount, username, messageText, messageHTML, imageId}) {
    database.run(`INSERT INTO messages (time, topic, channel, stream_title, viewer_count,
                                        username, message_text, message_html, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                        [time, topic, channel, streamTitle, viewerCount, username, messageText, messageHTML, imageId]);
}


/* ------ */

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        // dumpio: true,
    });

    var url = 'https://www.twitch.tv/' + channel;

    var page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1080, deviceScaleFactor: 1 });

    await page.goto(url);
    await page.waitFor(2000);

    // await page.evaluate(() => { document.querySelector('html').style.overflow = 'hidden'; })
    
    await page.exposeFunction('log', console.warn);
    await page.exposeFunction('rowInsert', rowInsert);
    await page.exposeFunction('setConsoleTitle', function (title) {
        var code = String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7);
        process.stdout.write(code);
    });

    const mark = crypto.randomBytes(16).toString('base64').match(/[A-z]/ig).join('');

    page.screenshot({path: `${dataFolder}/images/${mark}-LogBegin.png`});

    await page.exposeFunction('snapshot', async function (snapshotId) {
        var element = await page.$(`[${mark}-snapshot-id='${snapshotId}']`);
        await element.screenshot({path: `${dataFolder}/images/${mark}-${snapshotId}.png`});
    });

    await page.evaluate(async function([mark]) {
        var chatContainer = document.querySelector('.chat-scrollable-area__message-container');

        log('MARK', mark);

        var channel = document.querySelector('.tw-interactive[href] h1').innerText;
        var topic = document.querySelector('[data-a-target=stream-game-link]').innerText;
        var streamTitle = document.querySelector('[data-a-target=stream-title]').innerText;

        setConsoleTitle(`${channel}.${topic}`);

        var observer = new MutationObserver(function (mutations) {
            var viewerCount = document.querySelector('.tw-animated-number').innerText;
            var viewerCount = parseInt(viewerCount.replace(',', ''))

            var scrollbar = document.querySelector('.simplebar-track.vertical');

            if (scrollbar) {
                scrollbar.classList.remove('simplebar-track');
                scrollbar.setAttribute('style', 'visibility: hidden');
            }

            for (var mutation of mutations) {
                var comments = document.querySelectorAll(`.chat-scrollable-area__message-container .chat-line__message:not([${mark}])`);
                var markedComments = document.querySelectorAll(`.chat-scrollable-area__message-container .chat-line__message[${mark}]`);

                for (var comment of comments) {
                    var snapshotId = String(Math.random()).substring(2);
                    comment.setAttribute(`${mark}-snapshot-id`, snapshotId);
                    snapshot(snapshotId);

                    comment.setAttribute(mark, 'true');

                    var user = comment.querySelector('.chat-author__display-name').innerText;
                    var tokens = comment.querySelectorAll('.chat-line__message--emote, .text-fragment');

                    var message = Array.from(tokens).map((token) => {
                        if (token.classList.contains('chat-line__message--emote')) {
                            return token.getAttribute('alt');
                        } else if (token.classList.contains('text-fragment')) {
                            return token.innerText;
                        }
                    }).join('');

                    log(`${comments.length} ${markedComments.length} ${user}: ${message}`);
                    // log(`${user}: ${message}`);

                    var time = new Date().toISOString();
                    rowInsert({time, topic, channel, streamTitle, viewerCount,
                               username: user, messageText: message, messageHTML: comment.outerHTML,
                               imageId: `${mark}-${snapshotId}`});
                    // rowInsert({time, topic, channel, streamTitle, viewerCount,
                    //            username: user, messageText: message, messageHTML: comment.outerHTML});
                }
            }
        });

        log("LogBegin");

        var time = new Date().toISOString();
        var viewerCount = document.querySelector('.tw-animated-number').innerText;
        var viewerCount = parseInt(viewerCount.replace(',', ''))
        rowInsert({time, topic, channel, streamTitle, viewerCount, username: "SYSTEM",
                   messageText: "LogBegin", messageHTML: 'N/A', imageId: `${mark}-LogBegin`});

        observer.observe(chatContainer, { childList: true });
    }, [mark])

    await page.waitFor(7*24*60*60*1000);

    await page.close();
    await browser.close();
})();
