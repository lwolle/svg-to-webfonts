import fs from 'fs';
import path from 'path';

import webfontsGenerator from '../src/index';

const SRC = path.join(__dirname, 'src');
const FILES = fs.readdirSync(SRC).map((file) => path.join(SRC, file));
const OPTIONS = {
    dest: path.join(__dirname, '..', 'temp'),
    files: FILES,
    fontName: 'fontName',
    types: ['svg', 'ttf', 'woff', 'woff2', 'eot'],
    html: true,
};

webfontsGenerator(OPTIONS, (error) => {
    if (error) {
        return console.log('Fail!', error);

    }

    return console.log('Done!');
});
