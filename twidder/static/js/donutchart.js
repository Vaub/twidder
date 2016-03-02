'use strict';

var donutChart;
var legend;

function DonutChart(element){
    var options = {
        segmentShowStroke: false,
        animateRotate: true,
        animateScale: false,
        percentageInnerCutout: 50,
        tooltipTemplate: "<%= value %>",
        responsive: true,
        maintainAspectRatio: true
    };

    var context = element.getElementsByClassName("chart_canvas")[0].getContext('2d');

    donutChart = new Chart(context).Doughnut([], options);
    legend = element.getElementsByClassName("chart_legend")[0];

    return {
        update:function(data){
            updateChart(data);
            legend.innerHTML = donutChart.generateLegend();
        }
    }
}

function updateChart(data){
    var convertedData = convertData(data);

    convertedData.forEach(function(d, index){
        if (!donutChart.segments.length){
            donutChart.addData(d)
        } else{
            donutChart.segments[index].value = d.value;
        }
    });

    donutChart.update();
}

function convertData(data){
    var colors = ["#09355C", "#CBCBCB", "#B61B12"]
    var chartData = [];

    var findName = function(name){
        return {
            nb_connected_users:"Number of connected user"
        }[name] || name
    };

    Object.keys(data)
        .filter(function(d) { return data.hasOwnProperty(d) })
        .forEach( function(d, index){

            var convertedData = {
                label: findName(d),
                color: colors[index%(colors.length-1)],
                value: data[d]
            };

            chartData.push(convertedData);
        });

    return chartData;
}

