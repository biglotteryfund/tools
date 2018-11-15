#!/usr/bin/env node
'use strict';
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const _ = require('lodash');

const pages = 19;
const urlBase = 'https://31.221.8.237/funding/funding-finder?sc=1&cpage=';

const init = async () => {
    const allLinks = [];
    for (let i = 0; i <= pages; i++) {
        const url = `${urlBase}${i}`;
        try {
            await rp({
                url: url,
                strictSSL: false,
            }).then(response => {
                const $ = cheerio.load(response);
                const links = $('.programmeListTitleBar a');
                links.each(function(i, elem) {
                    const path = $(this).attr('href');
                    allLinks.push(`https://31.221.8.237${path}`);
                });
            });
        } catch (e) {
            console.log(e);
        }
    }
    return allLinks
};

let links = init().then(links => {
    const uniqueLinks = _.uniq(links);
    console.log(JSON.stringify(uniqueLinks, null, 4));
});

