const https = require('https');

const CLIENT_ID = '5O8BrSfUAItDuV0cGY9XDyvQN4RpRhLE';
const CLIENT_SECRET = 'oZtuBjZDPriibqg0';
const FLIGHT = '4865';
const CARRIER = 'U2';
const DATE = '2026-03-05'; // Tomorrow

async function getAmadeusToken() {
    const data = `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.amadeus.com',
            path: '/v1/security/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => resolve(JSON.parse(body).access_token));
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function testFlight() {
    try {
        const token = await getAmadeusToken();
        console.log('Token obtained.');

        const url = `https://api.amadeus.com/v2/schedule/flights?carrierCode=${CARRIER}&flightNumber=${FLIGHT}&scheduledDepartureDate=${DATE}`;

        https.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                if (json.data && json.data.length > 0) {
                    console.log('SUCCESS: Flight found in Schedules!');
                    console.log(JSON.stringify(json.data[0], null, 2));
                } else {
                    console.log('NOT FOUND in Schedules.');
                    console.log('Raw response:', JSON.stringify(json, null, 2));
                }
            });
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

testFlight();
