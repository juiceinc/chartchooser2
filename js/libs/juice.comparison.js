if(juice === undefined)
  var juice = {};

juice.comparison = function(conf){
  var _conf = conf || {};
  var container = _conf.container || "#chart-match-up",
      height = _conf.height || 250,
      width = _conf.width || 300,
      margin = {'top': 30, 'right': 10, 'bottom': 10, 'left': 50},
      boundaryLineColor = '#333',
      connectorLineColor = '#999',
      comparison = {},
      microformat = {
        SYMBOL_FLOAT          : "d",
        SYMBOL_INT            : "i",
        SYMBOL_CURRENCY       : "$",
        SYMBOL_PERCENT        : "%",
        SYMBOL_NAN            : "--"
      }
      ;
  var INVALID_VALUE_OPACITY = 0;
  var chart = comparisonChart();


  comparison.update = function(data, metricColumn, summaryLeft, summaryRight, formatFx){

    var metric = metricColumn.name;

    var minMax = [
      d3.min(data, function(d) { return d[metric] ; }),
      d3.max(data, function(d) { return d[metric] ; })
      ];

    //min and max takes into account if more is better
    var min = ( metricColumn.moreIsBetter ) ? minMax[0] : minMax[1];
    var max = ( metricColumn.moreIsBetter ) ? minMax[1] : minMax[0];

    if(max === undefined || max === '')
      max = 0;
    if(min === undefined || min === '')
      min = 0;

    var y = d3.scale.linear()
      .domain([min, max])
      .range([height-margin.top - margin.bottom, margin.top]);

    var metricFormat = metricColumn.format;

    //maps any given value to Y axis, will return minimum of Y if value is invalid
    var conditionalY = function (d) { return isNaN(d.value) ? y(min) : y(d.value); };
    var formatValue = function (d) { return NaNOrFormat(d.value, d.format); };
    var alpha = function (d) { return isNaN(d.value) ? INVALID_VALUE_OPACITY : 1; };
    var leftData = {'value': summaryLeft[metric], 'format':  metricFormat};
    var rightData = {'value': summaryRight[metric], 'format': metricFormat};


    var formattedMax = NaNOrFormat(max, metricFormat);
    var formattedMin = NaNOrFormat(min, metricFormat);
    //update min/max labels
    d3.selectAll(".axis-top").data([formattedMax, formattedMax]).text(String);
    d3.selectAll(".axis-bottom").data([formattedMin, formattedMin]).text(String);

    //update left/right value labels and their positions
    d3.selectAll(".left-value").data([leftData])
    .transition()
      .attr('y',conditionalY)
      .text(formatValue);
    d3.selectAll(".right-value").data([rightData])
      .transition()
      .attr('y',conditionalY)
      .text(formatValue);

    //update left/right value indicators (circles)
    d3.selectAll(".left-value-indicator").data([leftData])
      .transition()
      .attr('cy', conditionalY)
      .attr('fill-opacity', alpha)
      .attr('stroke-opacity', alpha)
      ;
    d3.selectAll(".right-value-indicator").data([rightData])
      .transition()
      .attr('cy', conditionalY)
      .attr('fill-opacity', alpha)
      .attr('stroke-opacity', alpha)
      ;

    //draw a connector line from left to right
    var connectorLine = chart.selectAll(".connector")
          .data([{'from' : leftData.value, 'to': rightData.value, 'format': metricFormat}]);

      connectorLine
        .enter().append('line')
          .attr('class', 'connector')
          .attr('x1', margin.left)
          .attr('x2', width - margin.left - margin.right)
          .style("stroke", connectorLineColor)
          .call(updateConnector)
          ;

      connectorLine.call(updateConnector);
      connectorLine.exit().remove();


    function updateConnector(selection){
      selection
        .transition()
          .attr('y1', function(d){return conditionalY({'value': d.from});})
          .attr('y2', function(d){ return conditionalY({'value': d.to});})
          .attr('stroke-opacity', function (d, i) { return isNaN(d.to) || isNaN(d.from) ? INVALID_VALUE_OPACITY : 1; })
          ;
    }

    function NaNOrFormat (value, fmt){
      return (isNaN(value)) ? '' : format(value, fmt);
    }
    function format (value, fmt) {
      switch (fmt) {
        case microformat.SYMBOL_INT      : return d3.format(",.0f")(value);
        case microformat.SYMBOL_CURRENCY : return "$" + d3.format( "0,.2f")(value);
        case microformat.SYMBOL_FLOAT    : return d3.format("0,.2f")(value);
        case microformat.SYMBOL_PERCENT  : return d3.format('%')(value);
      }
      return value;
    }

  };

  function comparisonChart() {
    //chart svg
    var chart = d3.select(container).append("svg")
        .attr("class", "chart")
        .attr("width", width)
        .attr("height", height)
      .append("g")
       ;

       chart.append('rect')
       .attr('width', width)
       .attr('height', height)
       .style('fill', '#FFFFFF')
       ;


    //add boundary lines
    //x position calculator for boundaries
    var x = function (d, i) { return (i === 0) ? margin.left : width - margin.left - margin.right; };

    //boundary lines
    chart.selectAll(".boundary-line")
          .data([0,1])
        .enter().append('line')
          .attr('class', 'boundary-line')
          .attr('class', function(d, i) { return i === 0 ? 'left-line' : 'right-line'; })
          .attr('x1', x)
          .attr('y1', margin.top)
          .attr('x2', x)
          .attr('y2', height - margin.top - margin.bottom)
          .style("stroke", boundaryLineColor)
          ;

    //value indicators
    chart.selectAll(".value-indicator")
        .data([0,1])
      .enter().append('circle')
        .attr('class', 'value-indicator')
        .attr('class', function (d, i) {return i === 0 ? 'left-value-indicator' : 'right-value-indicator';})
        .attr('r', 3)
        .style('fill', 'steelblue')
        .attr('cx', x)
        .style("stroke", "#FF0000")
        ;


    var minMaxLabels = [
      {'className': 'axis-top axis-left', 'x': margin.left, 'y': margin.top -10, 'align': 'middle', 'value': 'top-left'},
      {'className': 'axis-bottom axis-left', 'x': margin.left, 'y': height - margin.top - margin.bottom +12, 'align': 'middle', 'value': 'bottom-left'},

      {'className': 'axis-top axis-right', 'x': width - margin.left-10, 'y': margin.top - 10, 'align': 'middle', 'value': 'top-right'},
      {'className': 'axis-bottom axis-right', 'x': width - margin.left-10, 'y': height - margin.top - margin.bottom + 12, 'align': 'middle', 'value': 'bottom-right'},

      {'className': 'left-value', 'x': margin.left - 10, 'y': margin.top,  'align': 'end', 'value': 'left'},
      {'className': 'right-value', 'x': width - margin.left, 'y':margin.top , 'align': 'left', 'value': 'right'}
    ];

    //boundary line (min/max) and left/right value labels
    chart.selectAll(".chart-label")
        .data(minMaxLabels)
      .enter().append('text')
        .attr('class', 'chart-label')
        .attr('class', function (d, i) { return d.className ;})
        .attr('x', function (d, i) { return d.x; } )
        .attr('y', function (d, i) {return d.y; } )
        .attr('dy', 5 )
        .attr("text-anchor", function (d, i) { return d.align; })
        //.text(function (d, i) { return d.value; })
        ;

    return chart;

  }

  return comparison;

};