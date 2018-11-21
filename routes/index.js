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
    ssl: false
});
client.connect();

cron.schedule('*/5 * * * *', () => {
    console.log('loading data begin ' + new Date());
    loadData().then(() => console.log('loading data done ' + new Date()));
});

function loadData() {
    let d = new Date();
    d.setDate(d.getDate() - 2);

    let timestamps;

    return client.query("select time_stamp from public.measurements ORDER BY time_stamp DESC LIMIT 1", [])
        .then(queryRes => {
                let options = {
                    uri: 'https://api.hackair.eu/measurements',
                    qs: {
                        location: '27.31887817382813,53.83348592751201|27.807426452636722,53.95487343610632',
                        timestampStart: queryRes.rows[0] ? queryRes.rows[0].time_stamp.toISOString() : d.toISOString(),
                        show: 'all',
                        source: 'sensors_arduino,sensors_bleair,webservices'
                    },
                    json: true
                };

                return rp(options);
            }
        )
        .then(data => {
            let value = _.chain(data.data).groupBy(e => e.loc.coordinates).value();
            _.forOwn(value, (coordinatesGroup, location) => {
                let datetimeGroup = _.chain(coordinatesGroup).groupBy('datetime').map(e => {
                    let pm2_5 = _.chain(e).filter(o => o.pollutant_q.name === 'PM2.5_AirPollutantValue').head().value();
                    pm2_5 = pm2_5 ? pm2_5.pollutant_q.value : null;
                    let pm10 = _.chain(e).filter(o => o.pollutant_q.name === 'PM10_AirPollutantValue').head().value();
                    pm10 = pm10 ? pm10.pollutant_q.value : null;
                    return {
                        'pm2_5': pm2_5,
                        'pm10': pm10,
                        timestamp: moment(e[0].date_str).toDate(),
                        latitude: e[0].loc.coordinates[1],
                        longitude: e[0].loc.coordinates[0]
                    };
                }).value();

                /*let optionsWeather = {
                 uri: 'https://api.openweathermap.org/data/2.5/weather',
                 qs: {
                 lat: datetimeGroup[0].latitude,
                 lon: datetimeGroup[0].longitude,
                 APPID: '89a08f4b50a1b7ab9af9106afb35f379',
                 units: 'metric'
                 },
                 json: true
                 };
                 rp(optionsWeather)
                 .then(data => {
                 _.forEach(datetimeGroup, e => {
                 e.humidity = data.main.humidity;
                 e.temperature = data.main.temp;
                 e.windSpeed = data.wind.speed;
                 e.windDirection = data.wind.deg;
                 putReading(e);
                 });
                 });*/

                _.forEach(datetimeGroup, e => putReading(e));
            });

        })
        .then(() => client.query("select time_stamp from public.measurements where humidity is null order by time_stamp asc", []))
        .then(queryRes => {
            timestamps = queryRes.rows;

            let diff = moment().diff(moment(queryRes.rows[0].time_stamp), 'days') + 1;

            let i;
            let promises = [];
            for (i = 0; i < diff; i = i + 3) {
                promises.push(rp({uri: 'http://pogoda.by/meteograph/jsonp.php?url=print_FM12_archive-XML.php?plot=26850&dt=' + moment().add(-i, 'days').format("YYYY-MM-DD")})
                    .then(body => {
                        let collection = JSON.parse(body.replace(/^callback\(/, '').replace(/\);$/, ''));
                        _.forEach(timestamps, function (p) {
                            let pogodabyData = _.chain(collection.conditions.tabular.time).filter(t => {
                                let from = moment.tz(t['@attributes'].from, "Europe/Minsk");
                                let to = moment.tz(t['@attributes'].to, "Europe/Minsk");
                                return moment(p.time_stamp).isBetween(from, to);
                            }).head().value();
                            if (pogodabyData) {
                                updateReading(p.time_stamp, pogodabyData.humidity['@attributes'].value || null, pogodabyData.temperature['@attributes'].value || null, pogodabyData.windDirection['@attributes'].deg || null, pogodabyData.windSpeed['@attributes'].ms || null)
                            }
                        });
                    })
                    .catch(e => console.error(e.stack)));
            }
            return Promise.all(promises);
        })
        .catch(e => console.error(e.stack));
}

router.get('/', (req, res, next) => {
    res.render('index');
});

router.get('/measurements', (req, res, next) => {
    let from = req.query.from ? moment(req.query.from).toDate() : moment().add(-1, 'days').toDate();
    client.query("select * from public.measurements where TIME_STAMP > $1 order by TIME_STAMP asc", [from])
        .then(queryRes => {
            res.status(200).json(_.chain(queryRes.rows).groupBy(e => e.longitude + '_' + e.latitude));

        })
        .catch(e => console.error(e.stack));

});

router.get('/polarChart', (req, res, next) => {
    client.query("SELECT longitude, latitude, wind_direction, AVG(pm2_5) as pm2_5_avg, AVG(pm10) as pm10_avg FROM measurements GROUP BY wind_direction, longitude, latitude HAVING wind_direction is NOT NULL ORDER BY wind_direction", [])
        .then(queryRes => {
            res.status(200).json(_.chain(queryRes.rows).groupBy(e => e.longitude + '_' + e.latitude));
        })
        .catch(e => console.error(e.stack));
});

function putReading(e) {
    client.query("INSERT INTO public.measurements(PM2_5, PM10, TIME_STAMP, humidity, temperature, wind_speed, wind_direction, latitude, longitude) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)", [e.pm2_5, e.pm10, e.timestamp, e.humidity, e.temperature, e.windSpeed, e.windDirection, e.latitude, e.longitude])
        .catch(e => console.error(e.stack))
}

function updateReading(timestamp, humidity, temperature, wind_direction, wind_speed) {
    client.query("update public.measurements set humidity=$1, temperature=$2, wind_direction=$3, wind_speed=$4 where time_stamp = $5", [humidity, temperature, wind_direction, wind_speed, timestamp])
        .catch(e => console.error(e.stack))
}

module.exports = router;
