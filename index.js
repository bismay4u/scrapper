const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('lodash');

var scrapRunner = 0;
var scrapThreads = 0;
var scrapFinalData = [];
var scraperFile = "output";

console.log("Starting Scrapper Utility\n--------------------------\n");

if (process.argv[2] != null && process.argv[2].length > 0) {
    scraperSrc = process.argv[2];
    config = loadConfigurations(scraperSrc);

    startScrapping(config.list, config.config, config.src);
} else {
    getUserInput(function (output) {
        scraperSrc = output.src;
        config = loadConfigurations(output.src);

        startScrapping(config.list, config.config, config.src);
    }, {
        type: 'input',
        name: 'src',
        message: "Give the source name.",
    });
}

function startScrapping(scrapList, scrapConfig, scrapSrc, ndx) {
    if (ndx == null) ndx = 0;
    //console.log(scrapList, scrapConfig, scrapSrc);
    scrapThreads = scrapList.length;

    if (ndx == 0) {
        scrapFinalData = [];
        scrapRunner = 0;
    }

    if (ndx == scrapThreads) {
        return [];
    }

    dataURI = scrapList[ndx];
    data = scrapURL(dataURI, scrapConfig);

    if (data != null && data.length > 0) {
        scrapFinalData.push(data);
    }

    if (ndx < scrapList.length) {
        setTimeout(function () {
            startScrapping(scrapList, scrapConfig, scrapSrc, ndx + 1);
        }, 2000);
    }
}

function scrapURL(scrapURL, scrapConfig) {
    if (scrapConfig.rules == null) scrapConfig.rules = {};
    var result = [];

    axios.get(scrapURL)
        .then((response) => {
            if (response.status === 200) {
                baseURL = scrapURL;
                if (baseURL.indexOf(".htm") > 1 || baseURL.indexOf(".php") > 1 || baseURL.indexOf(".asp") > 1 || baseURL.indexOf(".jsp") > 1) {
                    baseURL = baseURL.split("/");
                    delete baseURL[baseURL.length - 1];
                    baseURL = baseURL.join("/");
                }

                htmlData = response.data;
                var tempDOM = cheerio.load(htmlData);
                // console.log(htmlData);

                // brandName = tempDOM("h1>span").text().trim();
                tempRow = {};
                if (scrapConfig.type == "multirecord") {
                    _.each(scrapConfig.rules, function (a, b) {
                        a01 = a.split("/");
                        tempData = "";
                        if (a01.length > 1) {
                            tempDOM(a01[0]).each(function (i, elm) {
                                tempRow = {};
                                tempData = baseURL + tempDOM(elm).attr(a01[1]);
                                tempRow[b] = tempData.replace("//", "/").replace("http:/", "http://").replace("https:/", "https://");
                                scrapFinalData.push(tempRow);
                            });
                        } else {
                            tempDOM(a01[0]).each(function (i, elm) {
                                tempRow = {};
                                tempData = baseURL + tempDOM(a).text().trim();
                                tempRow[b] = tempData.replace("//", "/").replace("http:/", "http://").replace("https:/", "https://");
                                scrapFinalData.push(tempRow);
                            });
                        }
                    });
                } else {
                    _.each(scrapConfig.rules, function (a, b) {
                        a01 = a.split("/");
                        tempData = tempDOM(a).text().trim();
                        tempRow[b] = tempData.replace("//", "/").replace("http:/", "http://").replace("https:/", "https://");
                    });
                    tempRow['url'] = scrapURL;
                    scrapFinalData.push(tempRow);
                }
            }
            scrapRunner++;
            if (scrapRunner == scrapThreads) {
                saveScrapData();
            }
        })
        .catch((err) => {
            //console.log(err);
            scrapRunner++;
            if (scrapRunner == scrapThreads) {
                saveScrapData();
            }
        });

    return result;
}

function saveScrapData() {
    // console.log(scrapFinalData);
    fs.writeFile('./data/' + scraperFile + '.json', JSON.stringify(scrapFinalData, null, 4), (err) => console.log('JSON Created'));

    csvData = [];
    if (scrapFinalData.length > 0) {
        tempRow = [];
        _.each(scrapFinalData[0], function (a, b) {
            tempRow.push('"' + b + '"');
        });
        csvData.push(tempRow.join(","));
    }
    _.each(scrapFinalData, function (a, b) {
        tempRow = [];
        _.each(a, function (c, d) {
            c = c.replace('"', '`');
            tempRow.push('"' + c + '"');
        });
        csvData.push(tempRow.join(","));
    });
    csvString = csvData.join("\n");
    fs.writeFile('./data/' + scraperFile + '.csv', csvString, (err) => console.log('CSV Created'));

    console.log('\n\nScrapping Completed for ' + scraperFile + " for " + (scrapRunner - 1) + " URLs")
}

function loadConfigurations(scraperSrc) {
    if (scraperSrc == null || typeof scraperSrc == "object") {
        return {
            "config": {},
            "list": [],
            "src": scraperSrc
        };
    }
    scraperFile = scraperSrc;

    var scrapConfig = require('./src/' + scraperSrc + '/scrap.json');
    var scrapList = [];

    contents = fs.readFileSync('./src/' + scraperSrc + '/scrap.lst', 'utf8');

    scrapList = contents.split("\n");

    return {
        "config": scrapConfig,
        "list": scrapList,
        "src": scraperSrc
    };
}

async function getUserInput(callBack, options) {
    if (options == null) {
        var options = {
            type: 'input',
            name: 'ans',
            message: 'What is your answer?'
        };
    }
    const {
        prompt
    } = require('enquirer');

    var response = await prompt(options);

    console.log("\n");

    if (typeof callBack == "function") callBack(response);
}