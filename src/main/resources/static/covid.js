let data = null;

function main() {
    exponentialBackoff(fetchData, 500, 2, 60000);
}

function render() {
    let body = $("body");
    let message = $("<p style='text-align: center'>Data was fetched on " + data.timestamp + "</p>")
    let canvas = $("<canvas id='canvas'>")
    body.empty();
    body.append(message);
    body.append(canvas);

    let myChart = new Chart('canvas', {
        type: 'line',
        data: {
            labels: data.dataPoints.map(dp => dp.date),
            datasets: [{
                label: "New cases, weekly average",
                data: applyWeeklyAverageAround(data.dataPoints.map(dp => dp.newCases)),
                pointRadius: 0
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    type: 'logarithmic',
                    ticks: {
                        callback: function (value, index, values) {
                            if (value.toString().startsWith("1") ||
                                value.toString().startsWith("2") ||
                                value.toString().startsWith("5")) {
                                return value;
                            } else {
                                return "";
                            }
                        }
                    }
                }]
            },
            layout: {
                padding: {
                    left: 50,
                    right: 50,
                    top: 50,
                    bottom: 50
                }
            }
        }
    });
}

function applyWeeklyAverageAround(data) {
    return data.map((d, i) => {
        if (i < 3 || i > data.size - 4) {
            return null;
        } else {
            return (
                data[i - 3] +
                data[i - 2] +
                data[i - 1] +
                d +
                data[i + 1] +
                data[i + 2] +
                data[i + 3]
            ) / 7;
        }
    })
}

function fetchData() {
    return $.ajax("data")
        .done(payload => {
            data = payload;
            render();
        });
}

function exponentialBackoff(fn, wait, factor, max) {
    return fn()
        .fail(() => {
            let nextWait = wait * factor;
            if (nextWait > max) {
                nextWait = max;
            }
            setTimeout(() => exponentialBackoff(fn, nextWait, factor, max), wait);
        });
}

$(document).ready(() => {
    main();
});