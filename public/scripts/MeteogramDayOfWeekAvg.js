function MeteogramDayOfAvg(xml, container) {
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

    Highcharts.chart(container, {
        chart: {
            type: 'column'
        },
        title: {
            text: 'Day of Week Average'
        },
        xAxis: {
            categories:['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'PM, μg/m3'
            },
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
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
            '<td style="padding:0"><b>{point.y:.1f} μg/m3 ({point.pdk:.2f} ПДК)</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            }
        },

        series: [{
            name: 'PM 2.5 avg',
            data: _.map(this.data, e => {
                return {y: parseFloat(e.pm2_5_avg), pdk: parseFloat(e.pm2_5_avg / 25)}
            })
        }, {
            name: 'PM 10 avg',
            data: _.map(this.data, e => {
                return {y: parseFloat(e.pm10_avg), pdk: parseFloat(e.pm10_avg / 50)}
            })
        }]
    });

}

