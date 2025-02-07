require('dotenv').config({path: '.env.offline'});

const total_sectors = 25;
const total_users = 300;
const total_feedbacks = 150;

const seeds = [
    {file: 'sectors', args: [total_sectors]},
    {file: 'users', args: [total_users, total_sectors]},
    {file: 'managers', args: []},
    {file: 'feedbacks', args: [total_feedbacks]},
    {file: 'evaluations', args: []},
]

async function seed() {
    if (process.env.MYSQL_HOST !== '127.0.0.1') {
        console.error('host must be 127.0.0.1');
        return;
    }
    for (const {file, args} of seeds) {
        const fn = require(`./seeds/${file}`).seed;
        await fn(...args);
    }
}

module.exports = { seed };

seed();