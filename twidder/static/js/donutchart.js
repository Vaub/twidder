'use strict';

function donutChart(element){
    //A changer
    var data = [
       {
            value: 61,
            color: "#09355C",
            label: "Label 1"
        }, {
            value: 11,
            color: "#CBCBCB",
            label: "Label 2"
        }, {
            value: 28,
            color: "#B61B12",
            label: "Label 3"
        }
    ];

    var options = {
        segmentShowStroke: false,
        animateRotate: true,
        animateScale: false,
        percentageInnerCutout: 50,
        tooltipTemplate: "<%= value %>%", //Attention a value, a changer au besoins
        responsive: true,
        maintainAspectRatio: true
    };

    var context = element.getElementsByClassName("chart_canvas")[0].getContext('2d');
    var donutChart = new Chart(context).Doughnut(data, options);

    element.getElementsByClassName("chart_legend")[0].innerHTML = donutChart.generateLegend();
}