/**
 * This is a complex demo of how to set up a Highcharts chart, coupled to a
 * dynamic source and extended by drawing image sprites, wind arrow paths
 * and a second grid on top of the chart. The purpose of the demo is to inpire
 * developers to go beyond the basic chart types and show how the library can
 * be extended programmatically. This is what the demo does:
 *
 * - Loads weather forecast from www.yr.no in form of an XML service. The XML
 *   is translated on the Higcharts website into JSONP for the sake of the demo
 *   being shown on both our website and JSFiddle.
 * - When the data arrives async, a Meteogram instance is created. We have
 *   created the Meteogram prototype to provide an organized structure of the different
 *   methods and subroutines associated with the demo.
 * - The parseYrData method parses the data from www.yr.no into several parallel arrays. These
 *   arrays are used directly as the data option for temperature, precipitation
 *   and air pressure. As the temperature data gives only full degrees, we apply
 *   some smoothing on the graph, but keep the original data in the tooltip.
 * - After this, the options structure is build, and the chart generated with the
 *   parsed data.
 * - In the callback (on chart load), we weather icons on top of the temperature series.
 *   The icons are sprites from a single PNG image, placed inside a clipped 30x30
 *   SVG <g> element. VML interprets this as HTML images inside a clipped div.
 * - Lastly, the wind arrows are built and added below the plot area, and a grid is
 *   drawn around them. The wind arrows are basically drawn north-south, then rotated
 *   as per the wind direction.
 */

function Meteogram(xml, container) {
    // Parallel arrays for the chart data, these are populated as the XML/JSON file
    // is loaded
    this.symbols = [];
    this.winds = [];
    this.humidity = [];
    this.pm2_5 = [];
    this.pm10 = [];

    // Initialize
    this.xml = xml;
    this.container = container;

    // Run
    this.parseYrData();
}

/**
 * Function to smooth the temperature line. The original data provides only whole degrees,
 * which makes the line graph look jagged. So we apply a running mean on it, but preserve
 * the unaltered value in the tooltip.
 */
Meteogram.prototype.smoothLine = function (data) {
    var i = data.length,
        sum,
        value;

    while (i--) {
        data[i].value = value = data[i].y; // preserve value for tooltip

        // Set the smoothed value to the average of the closest points, but don't allow
        // it to differ more than 0.5 degrees from the given value
        sum = (data[i - 1] || data[i]).y + value + (data[i + 1] || data[i]).y;
        data[i].y = Math.max(value - 0.5, Math.min(sum / 3, value + 0.5));
    }
};


/**
 * Draw blocks around wind arrows, below the plot area
 */
Meteogram.prototype.drawBlocksForWindArrows = function (chart) {
    var xAxis = chart.xAxis[0],
        x,
        pos,
        max,
        isLong,
        isLast,
        i;

    for (pos = xAxis.min, max = xAxis.max, i = 0; pos <= max + 36e5; pos += 36e5, i += 1) {

        // Get the X position
        isLast = pos === max + 36e5;
        x = Math.round(xAxis.toPixels(pos)) + (isLast ? 0.5 : -0.5);

        // Draw the vertical dividers and ticks
        if (this.resolution > 36e5) {
            isLong = pos % this.resolution === 0;
        } else {
            isLong = i % 2 === 0;
        }
        chart.renderer.path(['M', x, chart.plotTop + chart.plotHeight + (isLong ? 0 : 28),
            'L', x, chart.plotTop + chart.plotHeight + 32, 'Z'])
            .attr({
                'stroke': chart.options.chart.plotBorderColor,
                'stroke-width': 1
            })
            .add();
    }

    // Center items in block
    chart.get('windbarbs').markerGroup.attr({
        translateX: chart.get('windbarbs').markerGroup.translateX + 8
    });

};

/**
 * Get the title based on the XML data
 */
Meteogram.prototype.getTitle = function () {
    return 'Meteogram for ' + this.xml.locationName;
};

/**
 * Build and return the Highcharts options structure
 */
Meteogram.prototype.getChartOptions = function () {
    var meteogram = this;

    return {
        chart: {
            renderTo: this.container,
            marginBottom: 100,
            marginRight: 30,
            marginTop: 50,
            plotBorderWidth: 1,
            height: 400,
            alignTicks: false,
            scrollablePlotArea: {
                minWidth: 310
            }
        },


        title: {
            text: this.getTitle(),
            align: 'left',
            style: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis'
            }
        },

        tooltip: {
            shared: true,
            useHTML: true,
            headerFormat:
            '<small>{point.x:%A, %b %e, %H:%M}</small><br>'

        },

        xAxis: [{ // Bottom X axis
            type: 'datetime',
            tickInterval: 2 * 36e5, // two hours
            minorTickInterval: 36e5, // one hour
            tickLength: 0,
            gridLineWidth: 1,
            gridLineColor: (Highcharts.theme && Highcharts.theme.background2) || '#F0F0F0',
            startOnTick: false,
            endOnTick: false,
            minPadding: 0,
            maxPadding: 0,
            offset: 30,
            showLastLabel: true,
            labels: {
                format: '{value:%H}'
            },
            crosshair: true
        }, { // Top X axis
            linkedTo: 0,
            type: 'datetime',
            tickInterval: 24 * 3600 * 1000,
            labels: {
                format: '{value:<span style="font-size: 12px; font-weight: bold">%a</span> %b %e}',
                align: 'left',
                x: 3,
                y: -5
            },
            opposite: true,
            tickLength: 20,
            gridLineWidth: 1
        }],

        yAxis: [{ // temperature axis
            title: {
                text: 'PM, μg/m3'
            },
            labels: {
                format: '{value}',
                style: {
                    fontSize: '10px'
                },
                x: -3
            },
            plotLines: [{ // zero plane
                value: 0,
                color: '#BBBBBB',
                width: 1,
                zIndex: 2
            }],
            maxPadding: 0.3,
            minRange: 8,
            tickInterval: 1,
            gridLineColor: (Highcharts.theme && Highcharts.theme.background2) || '#F0F0F0'

        }, { // precipitation axis
            title: {
                text: null
            },
            labels: {
                enabled: false
            },
            gridLineWidth: 0,
            tickLength: 0,
            minRange: 10,
            min: 0

        }, { // Air pressure
            allowDecimals: false,
            title: { // Title on top of axis
                text: 'Humidity %',
                rotation: -90,
                style: {
                    fontSize: '10px',
                    color: Highcharts.getOptions().colors[2]
                }
            },
            labels: {
                style: {
                    fontSize: '8px',
                    color: Highcharts.getOptions().colors[2]
                },
                y: 2,
                x: 3
            },
            gridLineWidth: 0,
            opposite: true,
            showLastLabel: true,
            tickPositioner:
                function () {
                    var max = Math.ceil(this.max) <= 95 ? (Math.ceil(this.max) + (5- Math.ceil(this.max)%5)) : 100,
                        positions = [],
                        tick = Math.floor(this.min)- Math.floor(this.min)%5,
                        increment = 5;
                    for (tick; tick - increment < max; tick += increment) {
                        positions.push(tick);
                    }
                    return positions;
                }
        }],

        legend: {
            enabled: true
        },

        plotOptions: {
            series: {
                pointPlacement: 'between'
            }
        },


        series: [{
            name: 'PM 2.5',
            data: this.pm2_5,
            type: 'spline',
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: true
                    }
                }
            },
            tooltip: {
                valueSuffix: ' μg/m3',
                pointFormat: '<span style="color:{point.color}">\u25CF</span> ' +
                '{series.name}: <b>{point.y}, {point.quality}</b><br/>'
            },
            zIndex: 1,
            color: '#FF3333'
        }, {
            name: 'PM 10',
            data: this.pm10,
            type: 'spline',
            marker: {
                enabled: false,
                states: {
                    hover: {
                        enabled: true
                    }
                }
            },
            tooltip: {
                valueSuffix: ' μg/m3'
            },
            zIndex: 2,
            color: '#4f37ff'
        }, {
            name: 'Air Humidity',
            color: Highcharts.getOptions().colors[2],
            data: this.humidity,
            marker: {
                enabled: false
            },
            shadow: false,
            tooltip: {
                valueSuffix: ' %'
            },
            dashStyle: 'shortdot',
            yAxis: 2
        }, {
            name: 'Wind',
            type: 'windbarb',
            id: 'windbarbs',
            color: Highcharts.getOptions().colors[1],
            lineWidth: 1.5,
            data: this.winds,
            vectorLength: 18,
            yOffset: -15,
            tooltip: {
                valueSuffix: ' m/s',
                pointFormat: '<span style="color:{point.color}">\u25CF</span> ' +
                '{series.name}: <b>{point.value}, {point.windDirectionName}</b><br/>'
            }
        }]
    };
};

/**
 * Post-process the chart from the callback function, the second argument to Highcharts.Chart.
 */
Meteogram.prototype.onChartLoad = function (chart) {

    //this.drawWeatherSymbols(chart);
    this.drawBlocksForWindArrows(chart);

};

/**
 * Create the chart. This function is called async when the data file is loaded and parsed.
 */
Meteogram.prototype.createChart = function () {
    var meteogram = this;
    this.chart = new Highcharts.Chart(this.getChartOptions(), function (chart) {
        meteogram.onChartLoad(chart);
    });
};

Meteogram.prototype.error = function () {
    $('#loading').html('<i class="fa fa-frown-o"></i> Failed loading data, please try again later');
};

/**
 * Handle the data. This part of the code is not Highcharts specific, but deals with yr.no's
 * specific data format
 */
Meteogram.prototype.parseYrData = function () {

    var meteogram = this,
        xml = this.xml,
        pointStart,
        forecast = xml;

    if (!forecast) {
        return this.error();
    }

    // The returned xml variable is a JavaScript representation of the provided
    // XML, generated on the server by running PHP simple_load_xml and
    // converting it to JavaScript by json_encode.
    Highcharts.each(
        forecast.time,
        function (time, i) {
            // Get the times - only Safari can't parse ISO8601 so we need to do
            // some replacements
            let from = moment.tz(time.time_stamp, "Europe/Minsk").toDate();
            let quality;
            let color;
            if (time.pm2_5 >= 0 && time.pm2_5 <= 10) {
                quality = 'Very Good';
                color = '#1ce816';
            } else if (time.pm2_5 > 10 && time.pm2_5 <= 25) {
                quality = 'Good';
                color = '#1ce816';
            } else if (time.pm2_5 > 25 && time.pm2_5 <= 35) {
                quality = 'Medium';
                color = '#e8ae55';
            }else if (time.pm2_5 > 35) {
                quality = 'Bad';
                color = '#e82525';
            }

            meteogram.pm2_5.push({
                x: from,
                y: time.pm2_5,
                quality: quality,
                color: color
            });
            meteogram.pm10.push({
                x: from,
                y: time.pm10
            });


            if (i % 2 === 0) {
                meteogram.winds.push({
                    x: from,
                    value: time.wind_speed,
                    direction: time.wind_direction,
                    windDirectionName: time.wind_direction_name
                });
            }

            meteogram.humidity.push({
                x: from,
                y: time.humidity
            });

           /* if (i === 0) {
                pointStart = (from + to) / 2;
            }*/
        }
    );

    // Smooth the line
    //this.smoothLine(this.humidity);

    //this.smoothLine(this.pm2_5);
    //this.smoothLine(this.pm10);

    // Create the chart when the data is loaded
    this.createChart();
};
// End of the Meteogram protype



// On DOM ready...

$(document).ready(function () {
    let d = new Date();
    d.setDate(d.getDate() - 1);
    $.ajax({
        dataType: 'json',
        url: 'measurements',
        data: {
            from: d.getTime()
        },
        success: function (measurements) {
            let i = 0;
            _.forOwn(measurements, (value, location) => {
                $('#container').append('<div id="container' + i + '" style="min-width: 310px; height: 400px; margin: 0 auto">' +
                    '<div style="margin-top: 100px; text-align: center" id="loading">' +
                    '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                '</div>' +
                '</div>');
                window.meteogram = new Meteogram({time: value, locationName: location}, 'container' + i);
                i++;
            });
        },
        error: Meteogram.prototype.error
    });
});