function updateGraphics(d, position) {
    let locationName = position.longitude + ' ' + position.latitude;
    $('#container').html('');
    $.ajax({
        dataType: 'json',
        url: 'measurements',
        data: {
            from: d,
            longitude: position.longitude,
            latitude: position.latitude
        },
        success: function (measurements) {
            let i = 0;
            $('#container').append('<div id="container' + i + '" style="min-width: 310px; height: 400px; margin: 0 auto">' +
                '<div style="margin-top: 100px; text-align: center" id="loading">' +
                '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                '</div>' +
                '</div>');

            window.meteogram = new Meteogram({
                time: measurements,
                locationName: locationName
            }, 'container' + i);
        },
        error: Meteogram.prototype.error
    });

    $.ajax({
        dataType: 'json',
        url: 'polarChart',
        data: {
            longitude: position.longitude,
            latitude: position.latitude
        },
        success: function (value) {
            let i = 0;
            $('#container').append('<div id="polarChart' + i + '" style="min-width: 310px; min-height: 400px; margin: 0 auto">' +
                '<div style="margin-top: 100px; text-align: center" id="loading">' +
                '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                '</div>' +
                '</div>');
            window.polarChart = new PolarChart({time: value, locationName: locationName}, 'polarChart' + i);
        }
    });
}
$(document).ready(function () {
    let d = moment().add(-1, 'days').toISOString();

    $.ajax({
        dataType: 'json',
        url: 'positions',
        success: function (positions) {
            let dropdown = $('#positions');
            dropdown.html('');
            positions.forEach(p => {
                dropdown.append("<option data-value='" + JSON.stringify(p) + "'>" + p.name + "</option>");
            });
            updateGraphics(d, positions[0]);
        }
    });

    $('select').on('change', function () {
        updateGraphics(d, $(this).find(":selected").data("value"));
    });
});