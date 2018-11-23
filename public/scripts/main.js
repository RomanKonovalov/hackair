function updateGraphics(from, to, position) {
    let locationName = position.name;
    $.ajax({
        dataType: 'json',
        url: 'measurements',
        data: {
            from: from.toISOString(),
            to: to.toISOString(),
            longitude: position.longitude,
            latitude: position.latitude
        },
        success: function (measurements) {
            let i = 0;
            let meteogram = $('#meteogram');
            meteogram.html('');
            meteogram.append('<div style="margin-top: 100px; text-align: center" id="loading">' +
                '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                '</div>');

            window.meteogram = new Meteogram({
                time: measurements,
                locationName: locationName
            }, 'meteogram');
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
            let polarChart = $('#polarChart');
            polarChart.html('');
            polarChart.append('<div style="margin-top: 100px; text-align: center" id="loading">' +
                '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                '</div>');
            window.polarChart = new PolarChart({time: value, locationName: locationName}, 'polarChart');
        }
    });
}
$(document).ready(function () {
    let from = moment().add(-1, 'days').toDate();
    let to = new Date();

    $.ajax({
        dataType: 'json',
        url: 'positions',
        success: function (positions) {
            let dropdown = $('#positions');
            dropdown.html('');
            positions.forEach(p => {
                dropdown.append("<option data-value='" + JSON.stringify(p) + "'>" + p.name + "</option>");
            });
            updateGraphics(from, to, positions[0]);
        }
    });

    $('select').on('change', function () {
        updateGraphics(from, to, $(this).find(":selected").data("value"));
    });

    let datepicker = $('#datepicker');
    datepicker.datepicker({
        //endDate: "today",
        autoclose: true,
        todayHighlight: true
    });

    datepicker.datepicker('setDate', new Date());

    datepicker.datepicker().on('changeDate', function (e) {
        let from = datepicker.datepicker('getDate');
        let to = moment(from).add(1, 'days').toDate();
        updateGraphics(from, to, $('#positions').find(":selected").data("value"));
    });
});