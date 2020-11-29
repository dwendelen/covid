let data = null;

let lines = [];
let chart = null;

function main() {
    exponentialBackoff(fetchData, 500, 2, 60000);
}

function render() {
    lines.push({
        selector: dp => dp.newCases,
        transformation: weeklyAverageAround
    });

    let body = $("body");
    let message = $("<p style='text-align: center'>Data was fetched on " + data.timestamp + "</p>")
    let canvas = $("<canvas id='canvas'>")
    let title = $("<h1>Settings</h1>")
    let settings = $(
        "<div>" +
        "<select>" +
        "<option>New cases</option>" +
        "<option>Admissions</option>" +
        "<option>In hospital</option>" +
        "<option>In ICU</option>" +
        "<option>Deaths</option>" +
        "</select>" +
        "<select>" +
        "<option>None</option>" +
        "<option>Weekly average, before point, round up</option>" +
        "<option>Weekly average, around point, round up</option>" +
        "</select>" +
        "</div>"
    )
    body.empty();
    body.append(message);
    body.append(canvas);
    body.append(title);
    body.append(settings);

    let dateSets = lines
        .map(line => {
            return {
                label: "label",
                data: line.transformation(data.dataPoints.map(line.selector)),
                pointRadius: 0,
                pointHitRadius: 5
            };
        });

    chart = new Chart('canvas', {
        type: 'line',
        data: {
            labels: data.dataPoints.map(dp => dp.date),
            datasets: dateSets
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

function noTransformation(data) {
    return data;
}

function weeklyAverageBefore(data) {
    return data.map((d, i) => {
        if (i < 7) {
            return null;
        } else {
            return Math.ceil((
                data[i - 6] +
                data[i - 5] +
                data[i - 4] +
                data[i - 3] +
                data[i - 2] +
                data[i - 1] +
                d
            ) / 7);
        }
    })
}

function weeklyAverageAround(data) {
    return data.map((d, i) => {
        if (i < 3 || i > data.size - 4) {
            return null;
        } else {
            return Math.ceil((
                data[i - 3] +
                data[i - 2] +
                data[i - 1] +
                d +
                data[i + 1] +
                data[i + 2] +
                data[i + 3]
            ) / 7);
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