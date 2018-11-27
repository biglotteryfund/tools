#!/usr/bin/env node
'use strict';
const cheerio = require('cheerio');
const moment = require('moment');
const _ = require('lodash');

const translations = {
    en: {
        million: 'million',
        fundingSize: 'Funding Size',
        applicationDeadline: 'Application Deadline',
        orgType: 'Organisation Type',
        totalAvailable: 'Total Available',
        area: 'Area',
    },
    cy: {
        million: 'miliwn',
        fundingSize: 'Maint yr ariannu',
        applicationDeadline: 'Terfyn amser ymgeisio',
        orgType: 'Math o fudiad',
        totalAvailable: 'Cyfanswm ar gael',
        area: 'Ardal',
    }
};

function parseProgrammeContent(prog, lang) {
    const $ = cheerio.load(prog);
    const $title = $('.programmeListTitleBar');
    const __ = translations[lang];

    const parseDefinitionList = dl => {
        const terms = dl.find('dt');
        let map = {};
        terms.each(function (i, elem) {
            const defs = $(this).nextUntil('dt');
            const type = $(this).text().trim().replace(':', '');
            defs.each(function (j) {
                const lines = $(this).html().split('<br>');
                if (lines.length > 2) {
                    map[type] = [];
                    lines.forEach(l => {
                        if (l !== '') {
                            map[type].push(l);
                        }
                    });
                } else {
                    map[type] = lines[0];
                }
            });
        });
        return map;
    };

    const keyFacts = parseDefinitionList($('.taxonomy-keyFacts'));

    const parseFundSize = fundSize => {
        if (!fundSize) { return }
        let range = [];
        fundSize = fundSize.replace(/&#xA3;/g, '').replace(/,/, '').replace(/£/g, '');
        let bits = fundSize.split(' - ');
        const regexMillions = /miliwn|million/i;
        bits.forEach(str => {
            if (str.match(regexMillions)) {
                str = str.replace(regexMillions, '').trim();
                range.push(parseFloat(str) * 1000000);
            } else {
                range.push(parseFloat(str.trim()));
            }
        });
        return range;
    };

    const fundSize = parseFundSize(keyFacts[__.fundingSize]);

    const url = $title.find('a').attr('href').trim();
    const parts = url.split('/');
    const slug = parts[parts.length - 1];

    const closingDate = $title.find('.fullDate').text().trim().replace(`${__.applicationDeadline}: `, '');
    let expiryDate = moment(closingDate);
    if (!expiryDate.isValid()) {
        // set a date in the past instead
        expiryDate = moment().subtract(1, 'year');
    }

    // Turn this into a string
    let orgType = null;
    if (keyFacts[__.orgType]) {
        if (!_.isArray(keyFacts[__.orgType])) {
            orgType = keyFacts[__.orgType];
        } else {
            orgType = keyFacts[__.orgType].join(', ');
        }
    }

    let area = null;
    if (keyFacts[__.area]) {

        const areaMap = {
            // en
            'England': 'england',
            'Wales': 'wales',
            'Scotland': 'scotland',
            'Northern Ireland': 'northernIreland',
            'UK-wide': 'ukWide',
            'Countries outside the UK': 'countriesOutsideTheUk',
            // cy
            'Lloegr': 'england',
            'Cymru': 'wales',
            'Yr Alban': 'scotland',
            'Gogledd Iwerddon': 'northernIreland',
            'DU gyfan': 'ukWide',
            'Gwledydd y tu allan i&apos;r DU': 'countriesOutsideTheUk',
        };

        if (_.isArray(keyFacts[__.area])) {
            area = keyFacts[__.area].map(a => areaMap[a]);
            // default to this for a few (4) programmes with multi-locations (which we don't support)
            area = 'ukWide';
        } else {
            area = areaMap[keyFacts[__.area]];
        }
    }

    const title = $title.find('h3').text().trim();

    return {
        title: title,
        slug: slug,
        expiryDate: expiryDate.toDate(),
        programmeIntro: `<p>${$('.infoDetailsLeft p').text()}</p>`,
        description: $('.infoDetailsLeft p').text(),
        area: area ? area : null,
        orgType: orgType ? orgType : null,
        minimum: fundSize && fundSize.length === 2 ? fundSize[0] : null,
        maximum: fundSize && fundSize.length === 2 ? fundSize[1] : null,
        fundSizeDescription: keyFacts[__.fundingSize] ? keyFacts[__.fundingSize].replace(/&#xA3;/g, '£') : null,
        totalAvailable: keyFacts[__.totalAvailable] ? keyFacts[__.totalAvailable].replace(/&#xA3;/g, '£') : null,
        applicationDeadline: closingDate,
        originalLink: url,
    };

}

module.exports = {
    parseProgrammeContent
};