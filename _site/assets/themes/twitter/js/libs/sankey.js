$(function() {
  var data,
      vis;

  var sankeyData,
      dimensions,
      matrix = [],
      groups = [],
      groupsPerDimension = [],
      metricKey,
      numGroups = groups.length,
      indexByGroup = {},
      groupByIndex = {};

  var w = 900,
      h = 800,
      baseHeight = 600,
      padding = 10,
      rectWidth = 20;

  var fill = d3.scale.category10();
  var sankey = layout.sankey();

  $('#input-form').submit(function() {
    data = $('textarea', this).val();
    setTimeout(makeSankey, 200);
    return false;
  });

  function makeSankey() {
    matrix = [],
    groups = [],
    dimensions = [],
    groupsPerDimension = [],
    numGroups = groups.length,
    indexByGroup = {},
    groupByIndex = {};

    if (!vis) {
    vis = d3.select("#viz-container").html('')
        .append("svg:svg")
          .attr("width", w)
          .attr("height", h);
        //.append("svg:g");
          //.attr("transform", "translate(0, 0)");
    }

    sankeyData = d3.csv.parse(data);
    normalizeData();

    sankey.matrix(matrix).groupsPerDimension(groupsPerDimension);
    sankey.width(w).height(baseHeight);
    fill.domain(d3.range(sankey.nodes().length));

    var g = vis.selectAll("g.group")
        .data(sankey.nodes);

    var rect =    g.enter().append("svg:g")
        .attr("class", "group")
        .append("rect");

    var t = g.transition().duration(500);

    t.select("rect")
      .attr("fill", function(d, i){ return fill(d.order);})
      .attr("x", function(d){ return d.x;})
      .attr("y", function(d){ return d.y;})
      .attr("width", function(d){ return d.width;})
      .attr("height", function(d){ return d.height;});

    g.on("mouseover", fade(0.09))
      .on("mouseout", fade(0.5));

    g.exit().remove();

    var flow = vis.selectAll("path.flow")
      .data(sankey.flows);

    var fe = flow.exit();

    flow.enter().append("svg:path").attr("class", "flow");
    var ft = flow.transition().duration(1000);

    ft
      .attr("d", path)
      .attr("fill", function(d, i){ return fill(d.target.order);})
      .attr("opacity", "0.5")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "1px");

    fe.remove();

    flow.on("mouseover", fadeThis(0.09, 0.5))
        .on("mouseout", fadeThis(0.5, 0.5));

  }

  function normalizeData() {

    // Extract the list of dimensions.
    // The last column is assumed to be the metric value
    dimensions = d3.keys(sankeyData[0]);
    metricKey = dimensions.splice(-1,1);

    var c = 0;
    dimensions.forEach(function(d, di) {
      sankeyData.forEach(function(o) {
        var v = d + "-" + o[d];
        if (!( v in indexByGroup )) {
          if (!groupsPerDimension[di]) groupsPerDimension[di] = [];
          groupsPerDimension[di].push(c);

          groupByIndex[c] = v;
          indexByGroup[v] = c++;
        }
      });
    });

    // Create the flow matrix
    sankeyData.forEach(function(o) {
      for (var i=-1, l=dimensions.length; ++i < l;) {
        var dimension = dimensions[i],
            group = o[dimension];
        var gi = indexByGroup[dimension + "-" + group];
        var row = matrix[gi];
        if (!row) {
          row = matrix[gi] = [];
          for (var j = -1; ++j < c;) row[j] = 0;
        }
        if (i < l-1) {
          var dn = dimensions[i+1],
              gn = dn + "-" + o[dn];
         row[ indexByGroup[gn] ] += Number(o[metricKey]);
        }
      }
    });
  }

  function path(d, index) {
    var pth = '',
        flowHeight = d.height,
        startx = d.startx,
        starty = d.starty,
        endx = d.endx,
        endy = d.endy;

    var offset = (endx - startx)/4;
    pth+= 'M' + startx + "," + starty;
    pth+= 'C' + (startx + offset) + "," + starty+ " " +(endx - offset) + "," + endy+ " " +endx + "," + endy;
    pth+= 'L' + endx + "," + (endy + flowHeight);
    pth+= 'C' + (endx - offset) + "," + (endy + flowHeight)+ " " +(startx + offset) + "," + (starty+flowHeight)+ " " +startx + "," + (starty+flowHeight);
    return pth;
  }

  function fade(opacity) {
    return function(d, i) {
      vis.selectAll('path.flow')
          .filter(function(o) {
            return o.source.index !== d.index && o.target.index !== d.index;
          })
          .transition().style("opacity", opacity);
    };
  }

  function fadeThis(opacityAll, opacityThis) {
    return function(d, i){
        vis.selectAll('path.flow').transition().style("opacity", opacityAll);
        if (opacityThis !== opacityAll) {
          d3.select(this).transition().style("opacity", opacityThis);
        }
      };
  }

});