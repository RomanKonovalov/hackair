const express = require('express');
const router = express.Router();

const request = require('request');
const rp = require('request-promise');
const _ = require('lodash');
const {Client} = require('pg');
const moment = require('moment-timezone');

const cron = require('node-cron');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});
client.connect();

cron.schedule('*/5 * * * *', () => {
    console.log('loading data begin');
    loadData();
    console.log('loading data done');
});

function loadData() {
    let d = new Date();
    d.setDate(d.getDate() - 2);

    let timestamps;

    return client.query("select time_stamp from public.readings ORDER BY time_stamp DESC LIMIT 1", [])
        .then(queryRes => {
                let options = {
                    uri: 'https://api.hackair.eu/measurements',
                    qs: {
                        sensor: '1099',
                        timestampStart: queryRes.rows[0] ? queryRes.rows[0].time_stamp.toISOString() : d.toISOString(),
                        show: 'all'
                    },
                    headers: {
                        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYXBpLmhhY2thaXIuZXUvdXNlcnMvbG9naW4iLCJpYXQiOjE1NDIwMDM2NzgsIm5iZiI6MTU0MjAwMzY3OCwianRpIjoiYlo4RFU5dGtVSjlOc0xKWiIsInN1YiI6Mjg3NiwicHJ2IjoiODdlMGFmMWVmOWZkMTU4MTJmZGVjOTcxNTNhMTRlMGIwNDc1NDZhYSJ9.vqtZWmXWxy2mndVtbjEnwASqwrZTAgAaeeAGnCVoB6o'
                    },
                    json: true
                };

                return rp(options);
            }
        )
        .then(data => {
            let pollutants = _.chain(data.data).groupBy('datetime').map(e => {
                let pm2_5 = _.chain(e).filter(o => o.pollutant_q.name === 'PM2.5_AirPollutantValue').head().value();
                let pm10 = _.chain(e).filter(o => o.pollutant_q.name === 'PM10_AirPollutantValue').head().value();
                if (!pm2_5 || !pm10 || !pm2_5.pollutant_q || !pm10.pollutant_q || !pm2_5.source_info || !pm2_5.source_info.sensor) {
                    return null;
                }
                return {
                    'pm2_5': pm2_5.pollutant_q.value,
                    'pm10': pm10.pollutant_q.value,
                    sensorId: pm2_5.source_info.sensor.id,
                    timestamp: new Date(pm2_5.datetime * 1000)
                };
            }).filter(e => !_.isNull(e)).value();

            _.forEach(pollutants, e => putReading(e));
        })
        .then(() => client.query("select time_stamp from public.readings WHERE humidity IS NULL ", []))
        .then(queryRes => timestamps = queryRes.rows)
        .then(() => rp({uri: 'http://pogoda.by/meteograph/jsonp.php?url=print_FM12_archive-XML.php?plot=26850&dt=' + moment().format("YYYY-MM-DD")}))
        .then(body => {
            let collection = JSON.parse(body.replace(/^callback\(/, '').replace(/\);$/, ''));
            _.forEach(timestamps, function (p) {
                let pogodabyData = _.chain(collection.conditions.tabular.time).filter(t => {
                    let from = moment.tz(t['@attributes'].from, "Europe/Minsk");
                    let to = moment.tz(t['@attributes'].to, "Europe/Minsk");
                    return moment(p.time_stamp).isBetween(from, to);
                }).head().value();
                if (pogodabyData) {
                    updateReading(p.time_stamp, pogodabyData.humidity['@attributes'].value || null, pogodabyData.temperature['@attributes'].value || null, pogodabyData.windDirection['@attributes'].deg || null, pogodabyData.windDirection['@attributes'].name || null, pogodabyData.windSpeed['@attributes'].ms || null)
                }
            });
        })
        .catch(e => console.error(e.stack));
}

router.get('/', (req, res, next) => {
    loadData().then(() => res.render('index'));
});

router.get('/forecast', (req, res, next) => {
    let d = new Date();
    d.setDate(d.getDate() - 2);
    //client.connect();
    let from = req.param('from') ? new Date(req.param('from') * 1) : d;
    client.query("select * from public.readings where TIME_STAMP > $1 order by TIME_STAMP asc", [from])
        .then(queryRes => {
            res.status(200).json({
                locationName: "locationName",
                time: queryRes.rows
            });

        })
        .catch(e => console.error(e.stack));

});

function putReading(e) {
    client.query("INSERT INTO public.readings(PM2_5, PM10, SENSOR_ID, TIME_STAMP) VALUES($1, $2, $3, $4)", [e.pm2_5, e.pm10, e.sensorId, e.timestamp])
        .catch(e => console.error(e.stack))
}

function updateReading(timestamp, humidity, temperature, wind_direction, wind_direction_name, wind_speed) {
    client.query("update public.readings set humidity=$1, temperature=$2, wind_direction=$3, wind_direction_name=$4, wind_speed=$5 where time_stamp = $6", [humidity, temperature, wind_direction, wind_direction_name, wind_speed, timestamp])
        .catch(e => console.error(e.stack))
}

module.exports = router;
