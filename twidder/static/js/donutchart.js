'use strict';

function DonutChart(element){
    var donutChart;
    var legend;

    var options = {
        segmentShowStroke: false,
        animateRotate: true,
        animateScale: false,
        percentageInnerCutout: 50,
        tooltipTemplate: "<%= value %>",
        responsive: true,
        maintainAspectRatio: true
    };

    function convertData(data){
        var colors = ["#09355C", "#CBCBCB", "#B61B12"];
        var chartData = [];

        var findName = function(name){
            return {
                nb_connected_users:"Number of connected user",
                nb_posts:"Number of posts",
                nb_views:"Number of views"
            }[name] || name
        };

        Object.keys(data)
            .filter(function(d) { return data.hasOwnProperty(d) })
            .forEach( function(d, index){

                var convertedData = {
                    label: findName(d),
                    color: colors[index%(colors.length)],
                    value: data[d]
                };

                chartData.push(convertedData);
            });

        return chartData;
    }

    function updateChart(data){
        var convertedData = convertData(data);
        var chartLabels = [];

        donutChart.segments.forEach(function(segment){
            chartLabels.push(segment.label);
        });

        convertedData.forEach(function(d, index){
            if (chartLabels.indexOf(d.label) == (-1)){
                donutChart.addData(d)
            } else{
                donutChart.segments[index].value = d.value;
            }
        });

        donutChart.update();
    }

    var context = element.getElementsByClassName("chart_canvas")[0].getContext('2d');

    donutChart = new Chart(context).Doughnut([], options);
    legend = element.getElementsByClassName("chart_legend")[0];

    return {
        update:function(data){
            donutChart.clear();
            updateChart(data);
            legend.innerHTML = donutChart.generateLegend();
        }
    }
}



