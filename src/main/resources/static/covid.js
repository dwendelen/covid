let data = null;

let lines = [];
let chart = null;
let scale = null;

let transformations = [
    {
        text: "None",
        transformation: data => data
    },
    {
        text: "Weekly average, before point, round up",
        transformation: data => {
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
    },
    {
        text: "Weekly average, around point, round up",
        transformation: data => {
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
    }
]

let selectors = [
    {
        text: "New cases",
        selector: dp => dp.newCases
    },
    {
        text: "Admissions",
        selector: dp => dp.admissions
    },
    {
        text: "In hospital",
        selector: dp => dp.hospital
    },
    {
        text: "In ICU",
        selector: dp => dp.icu
    },
    {
        text: "Deaths",
        selector: dp => dp.deaths
    }
]

let scales = [
    {
        text: "Linear",
        config: {
            type: "linear"
        }
    },
    {
        text: "Logarithmic",
        config: {
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
        }
    }
]

function main() {
    scale = scales[1];
    lines.push({
        selector: selectors[0],
        transformation: transformations[2]
    });
    exponentialBackoff(fetchData, 500, 2, 60000);
}

function render() {
    let body = $("body");
    body.empty();

    let message = $("<p style='text-align: center'>Data was fetched on " + data.timestamp + "</p>");
    body.append(message);

    let canvas = $("<canvas id='canvas'>");
    body.append(canvas);

    let title = $("<h1>Settings</h1>");
    body.append(title);

    let settings = $("<div>");

    let select = $("<select>");
    selectors.forEach((sel, idx) => {
        let s = lines[0].selector === sel ? "selected" : "";

        let opt = $("<option value='" + idx + "' " + s + ">" + sel.text + "</option>");
        select.append(opt);
    });
    select.change(() => {
        lines[0].selector = selectors[select.val()];
        redraw();
    });
    settings.append(select);

    let trans = $("<select>");
    transformations.forEach((t, idx) => {
        let s = lines[0].transformation === t ? "selected" : "";

        let opt = $("<option value='" + idx + "' " + s + ">" + t.text + "</option>");
        trans.append(opt);
    });
    trans.change(() => {
        lines[0].transformation = transformations[trans.val()];
        redraw();
    });
    settings.append(trans);

    body.append(settings);

    chart = new Chart('canvas', {
        type: 'line',
        data: {
            labels: data.dataPoints.map(dp => dp.date),
        },
        options: {
            animation: {
                duration: 0
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

    redraw();
}

function redraw() {
    chart.data.datasets = getDataSets();
    chart.options.scales.yAxes = [scale.config];
    chart.update();
}


let getDataSets = function () {
    return lines
        .map(line => {
            return {
                label: "label",
                data: line.transformation.transformation(data.dataPoints.map(line.selector.selector)),
                pointRadius: 0,
                pointHitRadius: 5
            };
        });
};

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