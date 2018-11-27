#!/usr/bin/env node
'use strict';
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const _ = require('lodash');

const { parseProgrammeContent } = require('./parseProgrammes');

const pages = 19;
const urlBase = 'https://31.221.8.237/funding/funding-finder?sc=1&cpage=';
const urlBaseWelsh = 'https://31.221.8.237/welsh/funding/funding-finder?sc=1&cpage=';

const fetchUrl = async (urlToUse, lang) => {
    let results = [];
    for (let i = 0; i <= pages; i++) {
        try {
            await rp({
                url: `${urlToUse}${i}`,
                strictSSL: false,
            }).then(response => {
                const $ = cheerio.load(response);
                const articles = $('article.programmeList');
                articles.each(function (i, elm) {
                    try {
                        let prog = parseProgrammeContent($(this).html(), lang);
                        prog.legacyId = `LEGACY-PROG-${prog.slug}`;
                        results.push(prog);
                    } catch (e) {
                        console.log('Error parsing programme');
                        console.log(e);
                    }
                });
            });
        } catch (e) {
            console.log(e);
        }
    }
    // Some duplication in here
    return _.uniqBy(results, 'slug');
};

const init = async () => {
    const allProgrammes = {};

    const enResults = await fetchUrl(urlBase, 'en');
    const cyResults = await fetchUrl(urlBaseWelsh, 'cy');

    return {
        en: enResults,
        cy: cyResults
    };
};


// Usage: ./programmes.js > content/parsedProgrammes.json
init().then(progs => {
    console.log(JSON.stringify(progs, null, 4));
});

