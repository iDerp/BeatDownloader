var inquirer = require('inquirer');
var clear = require('clear');
const https = require('https');
const request = require('request');
const sleep = require('sleep-promise');
var sanitize = require("sanitize-filename");
var splitArray = require('split-array');
var fs = require('fs');
const cliProgress = require('cli-progress');

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

let versionID = "1.0.0 (20210803)"

var mapList = [];

let downloadMaps = (type, i, progress, thread, site) => {
    if (thread[i] != null) {
        var file = fs.createWriteStream(`./${type}/${sanitize(thread[i].name)}.zip`);
        https.get({
            hostname: site,
            path: thread[i].url,
            headers: {
                "User-Agent": `github.com/iDerp/BeatDownloader/${versionID}`,
                "Host": site
            }
        }, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                file.close();
                progress.increment();
                downloadMaps(type, i + 1, progress, thread, site);
            });
        }).on('error', function (err) {
            fs.unlink(dest);
            progress.increment();
            downloadMaps(type, i + 1, progress, thread, site);
        });
    } else {
        // progress.stop()
        // mainMenu()
    }
}

let collectMaps = (type, siteSelection, total, i, progress, threads) => {
    if (siteSelection == "beatsaver.com") {
        var options = {
            method: 'GET',
            url: `https://beatsaver.com/api/search/text/${i}?order=${type}&automapper=true`,
            headers: {
                "User-Agent": `github.com/iDerp/BeatDownloader/${versionID}`,
                "Host": "beatsaver.com"
            },
            json: true
        };
        request(options, function (error619, res1, body1) {
            if (res1 != null) {
                if (res1.body.docs == null && res1.body.toLowerCase().includes("rate limit")) {
                    let sleepTime = parseInt(res1.body.toLowerCase().split("retry in ")[1].split(" m")[0]) * 1000;
                    if (sleepTime > 30000) {
                        sleepTime = sleepTime / 1000
                    } else if (sleepTime < 0) {
                        sleepTime = 30000
                    } else {
                        sleepTime = 1000
                    }
                    // console.log(`Waiting for ${sleepTime}ms (Ratelimit)`)
                    sleep(sleepTime).then(() => {
                        collectMaps(type, siteSelection, total, i, progress, threads)
                    })
                } else {
                    if (res1.body.docs.length > 0 && (mapList.length + res1.body.docs.length) <= total) {
                        let processSongs = (i2) => {
                            if (res1.body.docs[i2] != null) {
                                mapList.push({ name: res1.body.docs[i2].name, url: res1.body.docs[i2].directDownload })
                                processSongs(i2 + 1)
                            } else {
                                progress.update(mapList.length)
                                collectMaps(type, siteSelection, total, i + 1, progress, threads)
                            }
                        }
                        processSongs(0)
                    } else {
                        if (res1.body.docs.length == 0) {
                            progress.update(mapList.length)
                            progress.stop()
                            const b1 = new cliProgress.SingleBar({
                                format: 'Downloading Maps ||{bar}|| {percentage}% || {value}/{total} Maps',
                                barCompleteChar: '\u2588',
                                barIncompleteChar: '\u2591',
                                hideCursor: true
                            });
                            b1.start(mapList.length, 0);
                            splitArray(mapList, parseInt(mapList.length / threads)).forEach(newThread => {
                                downloadMaps(type.toLowerCase(), 0, b1, newThread, siteSelection)
                            })
                        } else {
                            let processSongs = (i2) => {
                                if (res1.body.docs[i2] != null && (mapList.length + 1) <= total) {
                                    mapList.push({ name: res1.body.docs[i2].name, url: res1.body.docs[i2].directDownload })
                                    processSongs(i2 + 1)
                                } else {
                                    progress.update(mapList.length)
                                    progress.stop()
                                    const b1 = new cliProgress.SingleBar({
                                        format: 'Downloading Maps ||{bar}|| {percentage}% || {value}/{total} Maps',
                                        barCompleteChar: '\u2588',
                                        barIncompleteChar: '\u2591',
                                        hideCursor: true
                                    });
                                    b1.start(mapList.length, 0);
                                    splitArray(mapList, parseInt(mapList.length / threads)).forEach(newThread => {
                                        downloadMaps(type.toLowerCase(), 0, b1, newThread, siteSelection)
                                    })
                                }
                            }
                            processSongs(0)
                        }
                    }
                }
            } else {
                console.log(res1.body)
                console.log(error619)
                sleep(2500).then(() => {
                    collectMaps(type, siteSelection, total, i, progress, threads)
                })
                }
        })
    }
}

let mainMenu = () => {
    mapList = [];
    clear()
    console.log(`BeatDownloader (Beat Saber Song Downloader) by iDerp | v${versionID}`)
    inquirer.prompt([
            {
                type: 'list',
                name: 'type',
                message: 'What category would you like to sort by?',
                pageSize: 10,
                choices: [
                    'Latest',
                    'Rating',
                    'Curated',
                    'Duration',
                    {
                        name: 'Map Creator',
                        disabled: 'Coming Soon',
                      },
                    new inquirer.Separator(),
                    'Exit',
                ],
            },
        ]).then((answers) => {
            if (answers.type != "Exit") {
                let continueCategory = (siteSelection) => {
                    var questions2 = [
                        {
                            type: 'number',
                            name: 'amount',
                            message: "How many maps do you want to download?",
                        }
                    ];

                    inquirer.prompt(questions2).then((answers2) => {
                        var questions3 = [
                            {
                                type: 'number',
                                name: 'amount',
                                message: "How many threads do you want to download with? (Max recommended 8)",
                            }
                        ];

                        inquirer.prompt(questions3).then((answers3) => {
                            console.log("NOTE: Program will not close on completion")
                            const b1 = new cliProgress.SingleBar({
                                format: 'Scraping Songs ||{bar}|| {percentage}% || {value}/{total} Scraped',
                                barCompleteChar: '\u2588',
                                barIncompleteChar: '\u2591',
                                hideCursor: true
                            });
                            b1.start(parseInt(answers2.amount), 0);
                            if (!fs.existsSync(`./${answers.type.toLowerCase()}`)) {
                                fs.mkdirSync(`./${answers.type.toLowerCase()}`);
                            }
                            collectMaps(answers.type, siteSelection.toLowerCase(), parseInt(answers2.amount), 0, b1, parseInt(answers3.amount))
                        });
                    });
                }
                continueCategory("BeatSaver.com")
                    } else {
                        console.log("Goodbye! Don't break your VR controllers!")
                    }
        });
}

mainMenu()