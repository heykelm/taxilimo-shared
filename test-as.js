const https = require('https');

const API_KEY = '6268bd76bc2aa44f98b81e1afae8b1d';
const FLIGHT = 'U24865';

function testFlight() {
    console.log(`Testing flight ${FLIGHT} on AviationStack...`);
    const url = `https://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${FLIGHT}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    console.error('API Error:', json.error);
                } else if (!json.data || json.data.length === 0) {
                    console.log('No flight data found.');
                } else {
                    const flight = json.data[0];
                    console.log('Flight:', flight.flight.iata);
                    console.log('Status:', flight.flight_status);
                    console.log('Live:', flight.live);
                }
            } catch (e) {
                console.error('Parse error:', e);
                console.log('Raw data leading part:', data.substring(0, 100));
            }
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

testFlight();
