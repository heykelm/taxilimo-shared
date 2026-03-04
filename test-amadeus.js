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

const AIRLINE_NAMES = {
    'EK': 'Emirates', 'AF': 'Air France', 'U2': 'EasyJet', 'LH': 'Lufthansa',
    'BA': 'British Airways', 'TK': 'Turkish Airlines', 'QR': 'Qatar Airways',
    'EY': 'Etihad', 'FR': 'Ryanair', 'VY': 'Vueling', 'TO': 'Transavia',
    'LX': 'Swiss', 'OS': 'Austrian', 'SN': 'Brussels Airlines', 'SK': 'SAS',
    'AY': 'Finnair', 'TP': 'TAP Portugal', 'LO': 'LOT Polish', 'KM': 'Air Malta',
    'JU': 'Air Serbia', 'OU': 'Croatia Airlines', 'A3': 'Aegean', 'AZ': 'ITA Airways',
    'UX': 'Air Europa', 'IB': 'Iberia', 'AA': 'American Airlines', 'DL': 'Delta',
    'UA': 'United', 'AC': 'Air Canada', 'AT': 'Royal Air Maroc', 'TU': 'Tunisair',
    'AH': 'Air Algérie', 'BJ': 'Nouvelair', 'V7': 'Volotea', 'XK': 'Air Corsica',
    'BT': 'Air Baltic', 'TS': 'Air Transat', 'EI': 'Aer Lingus', 'LY': 'El Al',
    'EW': 'Eurowings', 'LS': 'Jet2', 'LG': 'Luxair', 'DY': 'Norwegian',
    'PC': 'Pegasus', 'SV': 'Saudia', 'QS': 'Smartwings', 'RO': 'Tarom',
    'T7': 'Twin Jet', 'WF': 'Wideroe',
};

function mapAmadeusEntry(entry) {
    const flightPoints = entry.flightPoints || []
    const depPoint = flightPoints[0] || {}
    const arrPoint = flightPoints[flightPoints.length - 1] || {}
    const carrierCode = entry.flightDesignator?.carrierCode || entry.carrierCode || ''
    const flightNumber = entry.flightDesignator?.flightNumber || entry.flightNumber || ''

    let status = null
    const depDelay = depPoint.departure?.timings?.find((t) => t.qualifier === 'STD')?.delays?.[0]?.duration
    const arrDelay = arrPoint.arrival?.timings?.find((t) => t.qualifier === 'STA')?.delays?.[0]?.duration

    if (depDelay || arrDelay) status = 'DELAYED'

    const scheduledDep = depPoint.departure?.timings?.find((t) => t.qualifier === 'STD')?.value
    const scheduledArr = arrPoint.arrival?.timings?.find((t) => t.qualifier === 'STA')?.value

    return {
        flightNumber: `${carrierCode}${flightNumber}`,
        airline: {
            name: AIRLINE_NAMES[carrierCode] || null,
            iata: carrierCode,
        },
        status: status || entry.status || null,
        departure: {
            airport: {
                iata: depPoint.iataCode,
                terminal: depPoint.departure?.terminal?.code,
            },
            scheduledTime: scheduledDep,
            estimatedTime: depPoint.departure?.timings?.find((t) => t.qualifier === 'ETD')?.value || scheduledDep,
        },
        arrival: {
            airport: {
                iata: arrPoint.iataCode,
                terminal: arrPoint.arrival?.terminal?.code,
            },
            scheduledTime: scheduledArr,
            estimatedTime: arrPoint.arrival?.timings?.find((t) => t.qualifier === 'ETA')?.value || scheduledArr,
        },
    }
}

async function testFlight() {
    try {
        const token = await getAmadeusToken();
        const url = `https://api.amadeus.com/v2/schedule/flights?carrierCode=${CARRIER}&flightNumber=${FLIGHT}&scheduledDepartureDate=${DATE}`;

        https.get(url, { headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                if (json.data && json.data.length > 0) {
                    console.log('MAPPED RESULT:');
                    console.log(JSON.stringify(mapAmadeusEntry(json.data[0]), null, 2));
                } else {
                    console.log('NOT FOUND');
                }
            });
        });
    } catch (e) { console.error(e); }
}

testFlight();
