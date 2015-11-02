var $ = require('jquery-detached').getJQuery();
require('bootstrap-detached').getBootstrap();
var Highcharts = require('highcharts-browserify/modules/drilldown');
require('highcharts-browserify/modules/data');
var cryptoJSMD5 = require("crypto-js/md5");
var handlebars = require("handlebars");
var moment = require('moment');
var numeral = require('numeral');

// API Endpoints
var issuesAPI = "../issues-api/api/json?tree=issues[id,priority,message,origin,state[state]]";
var issuesPerOriginAPI = "../issues-api/api/json?tree=issuesPerOrigin[*]";
var issuesGraphAPI = "../issues-api/api/json?tree=series";
var linesOfCodeSeriesAPI = "../loc-api/api/json?tree=series[fileCount,linesOfCode,build[number]]";
var linesOfCodeAPI = "../loc-api/api/json?pretty=true&tree=linesOfCode[fileCount,linesOfCode]";
var duplicateCodeSeriesAPI = "../duplicates-api/api/json?tree=series[duplicateLines,filesWithDuplicates,build[number]]";
var duplicateCodeAPI = "../duplicates-api/api/json?tree=duplicateCode[duplicateLines]";

// Handlebars templates & partials
var changesetTemplate = require('./changeset.hbs');
var buildTemplate = require('./build.hbs');
var issueRowTemplate = require('./issue.hbs');
var issueOriginRowTemplate = require('./issue-origin.hbs');
handlebars.registerPartial('changeset', changesetTemplate);

// Common functions
function createDrilldownEntry(name, id, data) {
    var entry = {};
    entry.name = name;
    entry.id = id;
    entry.data = data;
    return entry;
}

function createDrilldownData(name, value, color) {
    var data = {};
    data.name = name;
    data.y = value;
    data.color = color;
    return data;
}

function createPriorityDrilldownDataArray(lowCount, normalCount, highCount) {
    var idx = 0;
    var dataArr = [];
    if (lowCount > 0) {
        dataArr[idx++] = createDrilldownData("LOW", lowCount, "024700");
    }
    if (normalCount > 0) {
        dataArr[idx++] = createDrilldownData("NORMAL", normalCount, "#FFFF00");
    }
    if (highCount > 0) {
        dataArr[idx++] = createDrilldownData("HIGH", highCount, "#FF0000");
    }
    return dataArr;
}

// Code Trend
var issueByOriginChartOptions = {
    title: {
        text: null
    },
    subtitle: {
        text: 'Click slices to view priorities.'
    },
    credits: {
        enabled: false
    },
    chart: {
        renderTo: "issues-pie",
        type: 'pie'
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                distance: -40,
                connectorPadding: 0
            }
        }
    },
    series: [
        {
            name: "Issues"
        }
    ],
    drilldown: {
        series: []
    }
};

// Issues per Origin
function issuesPerOrigin() {
    var totalCount = 0, totalLow = 0, totalNormal = 0, totalHigh = 0;
    $.getJSON(issuesPerOriginAPI)
        .done(function (data) {
            $("#issues-per-origin").empty();
            var graphDataArray = [];
            var idx = 0;
            $.each(data.issuesPerOrigin, function (key, value) {
                totalOriginCount = value.length;
                totalCount = totalCount + totalOriginCount;
                lowCount = 0;
                normalCount = 0;
                highCount = 0;
                var origin = "";
                var graphDataEntry = {};
                graphDataEntry.name = key;
                graphDataEntry.y = totalOriginCount;
                graphDataEntry.drilldown = key;
                graphDataArray[idx] = graphDataEntry;
                $.each(value, function (j, issue) {
                    if (issue.priority == "HIGH") {
                        highCount++;
                    } else if (issue.priority == "NORMAL") {
                        normalCount++;
                    } else {
                        lowCount++;
                    }
                    origin = issue.origin;
                });
                totalLow = totalLow + lowCount;
                totalNormal = totalNormal + normalCount;
                totalHigh = totalHigh + highCount;
                issueByOriginChartOptions.drilldown.series[idx] = createDrilldownEntry(key, key, createPriorityDrilldownDataArray(lowCount, normalCount, highCount));
                var linkHref = "../issues-api/goToBuildResult?origin=" + origin;
                $("#issues-per-origin").append(issueOriginRowTemplate({
                    key: key,
                    linkHref: linkHref,
                    highCount: highCount,
                    normalCount: normalCount,
                    lowCount: lowCount,
                    totalOriginCount: totalOriginCount
                }));
                idx++;
            });
            // add totals
            $("#issues-per-origin").append(issueOriginRowTemplate({
                key: "Total",
                highCount: totalHigh,
                normalCount: totalNormal,
                lowCount: totalLow,
                totalOriginCount: totalCount
            }));
            $("#total-issue-count").text(numeral(totalCount).format('0,0'));
            // update Origin Pie chart
            issueByOriginChartOptions.series[0].data = graphDataArray;
            new Highcharts.Chart(
                // graph options
                issueByOriginChartOptions
            );
        });
}

// Issues Table
function issuesTable() {
    $.getJSON(issuesAPI)
        .done(function (data) {
            $("#codehealth-issues").empty();
            $.each(data.issues, function (i, issue) {
                // add to table
                var linkHref = "../issues-api/goToBuildResult?origin=" + issue.origin;
                var row = issueRowTemplate({
                    linkHref: linkHref,
                    issue: issue
                });
                $('#codehealth-issues').append(row);
            });

            var nrOfIssues = data.issues.length;
        })
        .always(function () {
            //console.log("JSON API called...")
        });
}

// Code Trend
var codeGraphOptions = {
    title: {
        text: null
    },
    chart: {
        renderTo: "loc",
        type: 'line'
    },
    credits: {
        enabled: false
    },
    series: [
        {
            name: "Lines of Code"
        },
        {
            name: "Duplicate Lines"
        }
    ],
    xAxis: {
        labels: {
            formatter: function () {
                return '#' + this.value;
            }
        },
        tickInterval: 1
    },
    yAxis: {
        floor: 0,
        min: 0
    },
    tooltip: {
        formatter: function () {
            var s = "<b>Build #" + this.x + "</b>";
            $.each(this.points, function () {
                s += "<br/>" + this.series.name + ": " + this.y;
            });
            return s;
        },
        shared: true
    }
};
function updateLocGraph() {
    // TODO only call createChart() when both AJAX calls are finished
    $.getJSON(linesOfCodeSeriesAPI)
        .done(function (data) {
            var dataArray = [];
            var idx = 0;
            var lastCount = 0;
            var lastTrend = 0;
            $.each(data.series, function (i, item) {
                var obj = [];
                obj[0] = parseInt(item.build.number);
                obj[1] = item.linesOfCode;
                lastTrend = item.linesOfCode - lastCount;
                lastCount = item.linesOfCode;
                dataArray[idx] = obj;
                idx++;
            });
            $("#total-line-trend").text(numeral(lastTrend).format('+0,0'));
            codeGraphOptions.series[0].data = dataArray;
            new Highcharts.Chart(
                codeGraphOptions
            );
        }
    );
    $.getJSON(duplicateCodeSeriesAPI)
        .done(function (data) {
            var dataArray = [];
            var idx = 0;
            $.each(data.series, function (i, item) {
                var obj = [];
                obj[0] = parseInt(item.build.number);
                obj[1] = item.duplicateLines;
                dataArray[idx] = obj;
                idx++;
            });
            codeGraphOptions.series[1].data = dataArray;
            new Highcharts.Chart(
                // graph options
                codeGraphOptions
            );
        }
    );
    $.getJSON(linesOfCodeAPI).done(function (data) {
        $("#total-line-count").text(numeral(data.linesOfCode.linesOfCode).format('0,0'));
        $("#total-file-count").text(numeral(data.linesOfCode.fileCount).format('0,0'));
    });
    $.getJSON(duplicateCodeAPI).done(function (data) {
        $("#total-duplicate-count").text(numeral(data.duplicateCode.duplicateLines).format('0,0'));
    });
}

// Issue Trend
var issueGraph;
var issueGraphOptions = {
    title: {
        text: null
    },
    chart: {
        renderTo: "issues-graph",
        type: 'line'
    },
    series: [
        {
            name: "Issues"
        }
    ],
    credits: {
        enabled: false
    },
    xAxis: {
        labels: {
            formatter: function () {
                return '#' + this.value;
            }
        },
        tickInterval: 1
    },
    yAxis: {
        floor: 0,
        min: 0
    },
    tooltip: {
        formatter: function () {
            var s = "<b>Build #" + this.x + "</b>";
            $.each(this.points, function () {
                s += "<br/>" + this.series.name + ": " + this.y;
            });
            return s;
        },
        shared: true
    }
};

function updateIssuesGraph() {
    $.getJSON(issuesGraphAPI)
        .done(function (data) {
            var dataArray = [];
            var idx = 0;
            var lastCount = 0;
            var lastTrend = 0;
            $.each(data.series, function (buildNr, issueCount) {
                var obj = [];
                obj[0] = parseInt(buildNr);
                obj[1] = issueCount;
                lastTrend = issueCount - lastCount;
                lastCount = issueCount;
                dataArray[idx] = obj;
                idx++;
            });
            $("#total-issue-trend").text(numeral(lastTrend).format('+0,0'));
            issueGraphOptions.series[0].data = dataArray;
            issueGraph = new Highcharts.Chart(
                // graph options
                issueGraphOptions
            );
        }
    );
}

function compareChangeSet(a, b) {
    if (a.timestamp != null && b.timestamp != null) {
        if (a.timestamp > b.timestamp) {
            return 1;
        } else if (a.timestamp < b.timestamp) {
            return -1;
        } else {
            return 0;
        }
    } else {
        if (a.revision != null && b.revision != null) {
            if (a.revision > b.revision) {
                return 1;
            } else if (a.revision < b.revision) {
                return -1;
            }
            else {
                return 0;
            }
        } else {
            return 0;
        }
    }
}

function updateChangesets() {
    var changeSetAPI = "../api/json?tree=builds[number,timestamp,changeSet[items[msg,comment,author[id,fullName,property[address]],date,commitId]]]{0,10}";
    // default image src is gravatar default image (if no mail specified)
    var gravatarSrc = "http://www.gravatar.com/avatar/default?f=y&s=64";
    $.getJSON(changeSetAPI)
        .done(function (data) {
            $("#changeset-container").empty();
            $.each(data.builds, function (buildIdx, build) {
                var changeSetsForBuild = [];
                var buildNr = build.number;
                var timestamp = build.timestamp;
                var changeSet = build.changeSet;
                $.each(changeSet.items, function (itemIdx, changeItem) {
                    var revision = changeItem.commitId;
                    var author = changeItem.author;
                    var date = changeItem.date;
                    var authorId = author.id;
                    var authorName = author.fullName;
                    var authorMail = "";
                    // find mail address
                    $.each(author.property, function (key, value) {
                        if (value.address != null) {
                            authorMail = value.address;
                            return false;
                        }
                    });
                    var msg = (changeItem.comment != null) ? changeItem.comment : changeItem.msg;
                    if (authorMail !== "") {
                        gravatarSrc = "http://www.gravatar.com/avatar/" + cryptoJSMD5(authorMail) + "?d=retro&s=64"
                    }
                    var momDate = null;
                    var timestamp = null;
                    if (date != null) {
                        // 2015-10-29 17:39:36 +0100
                        var parsedDate = moment(date, "YYYY.MM.DD HH:mm:ss ZZ");
                        momDate = parsedDate.calendar();
                        timestamp = parsedDate.format('x');
                    }
                    var singleChange = {
                        message: msg,
                        author: authorName,
                        authorId: authorId,
                        revision: revision,
                        gravatarSrc: gravatarSrc,
                        date: momDate,
                        timestamp: timestamp,
                        changeHref: "../" + buildNr + "/changes#" + revision
                    };
                    changeSetsForBuild.push(singleChange);
                });
                if (changeSetsForBuild.length > 0) {
                    changeSetsForBuild.sort(compareChangeSet).reverse();
                    var buildRes = buildTemplate({
                        number: buildNr,
                        timestamp: moment(new Date(timestamp)).calendar(),
                        changesets: changeSetsForBuild
                    });
                    $("#changeset-container").append(buildRes);
                }
            });
        });
}

function refreshData() {
    issuesPerOrigin();
    issuesTable();
    updateLocGraph();
    updateIssuesGraph();
    updateChangesets();
}

$(document).ready(function () {
    Highcharts.setOptions({
        colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
            '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1']
    });
    refreshData();
    // remove empty Jenkins sidepanel
    $("#side-panel").remove();
    $("#main-panel").css("margin-left", "0px");
});

// Refresh Button
$("#refresh-button").on("click", function () {
    refreshData();
});


