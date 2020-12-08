let data = null;

let lines = [];
let chart = null;
let scale = null;

let colors = ['blue', 'red', 'yellow', 'green'];
let nextColor = 0;

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
        code: "newCases",
        type: "province"
    },
    {
        text: "New hospital",
        code: "newHospital",
        type: "province"
    },
    {
        text: "In hospital",
        code: "inHospital",
        type: "province"
    },
    {
        text: "In ICU",
        code: "inIcu",
        type: "province"
    },
    {
        text: "Deaths",
        code: "deaths",
        type: "region"
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
let belgie = {
    code: "BE",
    text: "Belgium",
    parent: null
}
let vlaanderen = {
    code: "FL",
    text: "Vlaanderen",
    parent: belgie
};
let brussels = {// Brussels is both a province and a region
    code: "BR",
    text: "Brussels",
    parent: belgie
};
let wallonie = {
    code: "WA",
    text: "Wallonie",
    parent: belgie
};
let westVlaanderen = {
    code: "WV",
    text: "West Vlaanderen",
    parent: vlaanderen
};
let oostVlaanderen = {
    code: "OV",
    text: "Oost Vlaanderen",
    parent: vlaanderen
};
let antwerpen = {
    code: "AN",
    text: "Antwerpen",
    parent: vlaanderen
};
let vlaamsBrabant = {
    code: "VB",
    text: "Vlaams Brabant",
    parent: vlaanderen
};
let limburg = {
    code: "LM",
    text: "Limburg",
    parent: vlaanderen
};
let hainaut = {
    code: "HA",
    text: "Hainaut",
    parent: wallonie
};
let brabantWallon = {
    code: "BW",
    text: "Brabant Wallon",
    parent: wallonie
};
let namur = {
    code: "NA",
    text: "Namur",
    parent: wallonie
};
let liege = {
    code: "LG",
    text: "Liège",
    parent: wallonie
};
let luxembourg = {
    code: "LX",
    text: "Luxembourg",
    parent: wallonie
};

let areas = [
    belgie,
    vlaanderen,
    brussels,
    wallonie,
    westVlaanderen,
    oostVlaanderen,
    antwerpen,
    vlaamsBrabant,
    limburg,
    hainaut,
    brabantWallon,
    namur,
    liege,
    luxembourg
]

function main() {
    scale = scales[1];
    lines.push({
        selector: selectors[0],
        transformation: transformations[2],
        color: colors[nextColor],
        div: null,
        deleteButton: null
    });
    nextColor = (nextColor + 1) % colors.length;
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

    let lineDiv = createLineDiv(lines[0]);
    lines[0].deleteButton.prop("disabled", true);
    settings.append(lineDiv);

    body.append(settings);

    chart = new Chart('canvas', {
        type: 'line',
        data: {
            labels: data.dates
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

function createLineDiv(line) {
    let div = $("<div>");
    let select = $("<select>");
    selectors.forEach((sel, idx) => {
        let s = line.selector === sel ? "selected" : "";

        let opt = $("<option value='" + idx + "' " + s + ">" + sel.text + "</option>");
        select.append(opt);
    });
    select.change(() => {
        line.selector = selectors[select.val()];
        redraw();
    });
    div.append(select);

    let trans = $("<select>");
    transformations.forEach((t, idx) => {
        let s = line.transformation === t ? "selected" : "";

        let opt = $("<option value='" + idx + "' " + s + ">" + t.text + "</option>");
        trans.append(opt);
    });
    trans.change(() => {
        line.transformation = transformations[trans.val()];
        redraw();
    });
    div.append(trans);

    let deleteButton = $("<button>Delete</button>");
    deleteButton.click(() => {
        lines = lines.filter(e => e !== line);
        if (lines.length === 1) {
            lines[0].deleteButton.prop("disabled", true);
        }
        div.remove();
        redraw();
    });
    div.append(deleteButton);

    let copyButton = $("<button>Copy</button>");
    copyButton.click(() => {
        if (lines.length === 1) {
            lines[0].deleteButton.prop("disabled", false);
        }
        let newLine = {
            selector: line.selector,
            transformation: line.transformation,
            color: colors[nextColor],
            div: null,
            deleteButton: null
        };
        nextColor = (nextColor + 1) % colors.length;
        let newIdx = lines.findIndex(v => v === line) + 1;
        lines.splice(newIdx, 0, newLine);
        let newDiv = createLineDiv(newLine);
        div.after(newDiv);
        redraw();
    });
    div.append(copyButton);

    line.div = div;
    line.deleteButton = deleteButton;

    return div;
}

function redraw() {
    chart.data.datasets = getDataSets();
    chart.options.scales.yAxes = [scale.config];
    chart.update();
}


function getDataSets() {
    return lines
        .map(line => {
            return {
                label: line.selector.text,
                data: data[line.selector.code]["BE"],
                pointRadius: 0,
                pointHitRadius: 5,
                fill: false,
                borderColor: line.color
            };
        });
}

function fetchData() {
    return $.ajax("data")
        .done(payload => {
            data = {
                timestamp: payload.timestamp,
                dates: payload.dates,
                newCases: dataPoints(payload.newCases),
                newHospital: dataPoints(payload.newHospital),
                inHospital: dataPoints(payload.inHospital),
                inIcu: dataPoints(payload.inIcu),
                deaths: dataPoints(payload.deaths)
            };
            render();
        });
}

function dataPoints(series) {
    let result = {}
    for (let area of areas) {
        if(series[area.code]) {
            addRecursive(result, area, series[area.code]);
        }
    }
    return result;
}

function addRecursive(collector, area, data) {
    if(collector[area.code]) {
        for(let i = 0; i < collector[area.code].length; i++) {
            if(data[i]) {
                collector[area.code][i] += data[i];
            }
        }
    } else {
        collector[area.code] = [];
        collector[area.code].push(...data);
    }

    if(area.parent) {
        addRecursive(collector, area.parent, data)
    }
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