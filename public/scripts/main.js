function updateGraphics(from, to, position, type) {
    let locationName = position.name;

    if (type === 'dashboard') {
        $('#polarChart').hide();
        $('#meteogramAvg').hide();
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
                meteogram.show();
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
    } else if (type === 'reports') {
        $('#meteogram').hide();
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
                polarChart.show();
                polarChart.html('');
                polarChart.append('<div style="margin-top: 100px; text-align: center" id="loading">' +
                    '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                    '</div>');
                window.polarChart = new PolarChart({time: value, locationName: locationName}, 'polarChart');
            }
        });

        $.ajax({
            dataType: 'json',
            url: 'measurements',
            data: {
                longitude: position.longitude,
                latitude: position.latitude,
                avg: true
            },
            success: function (value) {
                let i = 0;
                let meteogramAvg = $('#meteogramAvg');
                meteogramAvg.show();
                meteogramAvg.html('');
                meteogramAvg.append('<div style="margin-top: 100px; text-align: center" id="loading">' +
                    '<i class="fa fa-spinner fa-spin"></i> Loading data from external source' +
                    '</div>');
                window.polarChart = new MeteogramAvg({time: value, locationName: locationName}, 'meteogramAvg');
            }
        });
    }


}
$(document).ready(function () {
    let from = moment().add(-1, 'days').toDate();
    let to = new Date();
    let type = 'dashboard';

    $.ajax({
        dataType: 'json',
        url: 'positions',
        success: function (positions) {
            let dropdown = $('#positions');
            dropdown.html('');
            positions.forEach(p => {
                dropdown.append("<option data-value='" + JSON.stringify(p) + "'>" + p.name + "</option>");
            });
            updateGraphics(from, to, positions[0], type);
        }
    });

    $('select').on('change', function () {
        updateGraphics(from, to, $(this).find(":selected").data("value"), type);
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
        updateGraphics(from, to, $('#positions').find(":selected").data("value"), type);
    });

    $('#dashboard').on('click', function (e) {
        let from = moment(datepicker.datepicker('getDate')).startOf('day').toDate();
        let to = moment(from).add(1, 'days').toDate();
        type = 'dashboard';
        updateGraphics(from, to, $('#positions').find(":selected").data("value"), type);
        $('li.nav-item a').each(function () {
            $(this).removeClass('active');
        });
        $(this).addClass('active');
    });

    $('#reports').on('click', function (e) {
        let from = moment(datepicker.datepicker('getDate')).startOf('day').toDate();
        let to = moment(from).add(1, 'days').toDate();
        type = 'reports';
        updateGraphics(from, to, $('#positions').find(":selected").data("value"), type);
        $('li.nav-item a').each(function () {
            $(this).removeClass('active');
        });
        $(this).addClass('active');
    });
});