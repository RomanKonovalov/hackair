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

cron.schedule('* * * * *', () => {
    console.log('loading data begin');
    loadData();
    console.log('loading data done');
});

function loadData() {
    let d = new Date();
    d.setDate(d.getDate() - 2);

    let timestamps;
	
	let optionsWeather = {
		uri: 'https://api.openweathermap.org/data/2.5/weather',
		qs: {
			lat: 53.923259,
			lon: 27.632786,
			APPID: '89a08f4b50a1b7ab9af9106afb35f379',
			units: 'metric'
		},
		json: true
	};
	let humidity, temperature, windDirection, windSpeed;

    return rp(optionsWeather)
		.then(data => {
			humidity = data.main.humidity;
			temperature = data.main.temp;
			windSpeed = data.wind.speed;
			windDirection = data.wind.deg;
		})
		.then(() => client.query("select time_stamp from public.readings ORDER BY time_stamp DESC LIMIT 1", []))
        .then(queryRes => {
                let options = {
                    uri: 'https://api.hackair.eu/measurements',
                    qs: {
                        location: '27.31887817382813,53.83348592751201|27.807426452636722,53.95487343610632',
                        timestampStart: queryRes.rows[0] ? queryRes.rows[0].time_stamp.toISOString() : d.toISOString(),
                        show: 'all'
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
                    timestamp: new Date(pm2_5.datetime * 1000),
					humidity: humidity,
					temperature:temperature,
					windSpeed:windSpeed,
					windDirection:windDirection
                };
            }).filter(e => !_.isNull(e)).value();
			console.log(pollutants);
            //_.forEach(pollutants, e => putReading(e));
        })
        //.then(() => client.query("select time_stamp from public.readings WHERE humidity IS NULL ", []))
        //.then(queryRes => timestamps = queryRes.rows)
        //.then(() => rp({uri: 'http://pogoda.by/meteograph/jsonp.php?url=print_FM12_archive-XML.php?plot=26850&dt=' + moment().format("YYYY-MM-DD")}))
        /*.then(body => {
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
        })*/
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
