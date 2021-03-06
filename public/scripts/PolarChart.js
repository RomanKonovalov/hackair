function PolarChart(xml, container) {
    // Parallel arrays for the chart data, these are populated as the XML/JSON file
    // is loaded
    this.symbols = [];
    this.winds = [];
    this.humidity = [];
    this.pm2_5 = [];
    this.pm10 = [];

    // Initialize
    this.data = xml.time;
    this.location = xml.locationName;
    this.container = container;

    Highcharts.chart(this.container, {

        chart: {
            polar: true
        },

        title: {
            text: 'Polar Chart for ' + this.location
        },

        pane: {
            startAngle: 0,
            endAngle: 360
        },

        xAxis: {
            tickInterval: 45,
            min: 0,
            max: 360,
            labels: {
                formatter: function () {
                    return this.value + '°';
                }
            }
        },

        yAxis: {
            min: 0,
            plotBands: [{ // Light air
                from: 0,
                to: 10,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {
                    text: 'Very good',
                    style: {
                        color: '#606060'
                    }
                }
            }, { // Light breeze
                from: 10,
                to: 25,
                color: 'rgba(0, 0, 0, 0)',
                label: {
                    text: 'Good',
                    style: {
                        color: '#606060'
                    }
                }
            }, { // Gentle breeze
                from: 25,
                to: 35,
                color: 'rgba(68, 170, 213, 0.1)',
                label: {
                    text: 'Medium',
                    style: {
                        color: '#606060'
                    }
                }
            }, { // Moderate breeze
                from: 35,
                to: 100,
                color: 'rgba(0, 0, 0, 0)',
                label: {
                    text: 'Bad',
                    style: {
                        color: '#606060'
                    }
                }
            }]
        },

        plotOptions: {
            series: {
                pointStart: 45,
                pointInterval: 90
            },
            column: {
                pointPadding: 0,
                groupPadding: 0
            }
        },

        series: [{
            type: 'area',
            name: 'PM 2.5 avg',
            marker: {
                enabled: true,
                states: {
                    hover: {
                        enabled: true
                    }
                }
            },
            data: _.map(this.data, e => {
                return [e.wind_direction, e.pm2_5_avg]
            })
        }, {
            type: 'area',
            name: 'PM 10 avg',
            marker: {
                enabled: true,
                states: {
                    hover: {
                        enabled: true
                    }
                }
            },
            data: _.map(this.data, e => {
                return [e.wind_direction, e.pm10_avg]
            })
        }]
    });
}

