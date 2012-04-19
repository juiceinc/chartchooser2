if(juice === undefined)
  var juice = {};

juice.sankey = function() {
  var sankey = {},
      matrix,
      n,
      nodes,
      flows,
      groupsPerDimension=[],
      padding=5,
      width=400,
      height=400,
      rectWidth=10,
      xScale,
      yValues;

  function relayout() {
    var sink = [],
        source = [],
        row,
        value,
        isSink,
        isSource,
        incomingEdges = [],
        outgoingEdges = [],
        x,
        i,
        j,
        len;

    nodes = [];
    flows = [];
    xScale = d3.scale.ordinal().rangePoints([0, width], 0.2);
    xScale.domain(d3.range(n));

    for (i = -1; ++i < n;) {
      x = 0;
      row = matrix[i];
      isSink = false;
      isSource = false;
      if (!incomingEdges[i]) incomingEdges[i] = [];
      if (!outgoingEdges[i]) outgoingEdges[i] = [];

      value = d3.sum(row);
      if (value === 0) {
        sink.push(i); // no outgoing flows
        isSink = true;
      }

      for (j = -1; ++j < n;) {
        x += matrix[j][i];

        if (matrix[i][j] > 0) {
          outgoingEdges[i].push(j);
          if (!incomingEdges[j]) {
            incomingEdges[j] = [];
          }
          incomingEdges[j].push(i);
        }
      }
      if (x === 0) {
        source.push(i); //no incoming flows
        isSource = true;
      }

      value = Math.max(value, x);

      //add the node
      nodes.push({
        index: i,
        value: value,
        depth: isSource ? 0 : (isSink ? n-1 : i),
        order: 0
      });
    }

    //calculate the flows
    for (i = -1; ++i < n;) {
      for (j = i; j < n; j++) {
        var f = matrix[i][j];
        if (f > 0) {
          flows.push({
            source: nodes[i],
            target: nodes[j],
            value: f
          });
        }
      }
    }

    // ----- Find the order of the nodes
    var maxDepth = groupsPerDimension.length,
        groupSums = [],
        maxGroupsPerDimension = 0;

    if (groupsPerDimension.length > 0) {
      groupsPerDimension.forEach(function(grp, di) {
        grp.forEach(function(g,i) {
          var node = nodes[g];
          node.depth = di;
          if (!groupSums[di]) groupSums[di] = 0;
          groupSums[di] += node.value;
        });
        maxGroupsPerDimension = d3.max([maxGroupsPerDimension, grp.length]);
      });
    }
    else
    {
      //do a topological sort to find the order of the nodes
      var L = [], // empty list that will contain the sorted nodes
          S = source.slice(0), // list of all nodes with no incoming edges. So start with the sources
          j = 0, // the depth of the node, initialized to 0
          D = [], // list containing the depth of node n (D[n])
          node;

      groupsPerDimension[j] = [],
      groupSums[j] = 0;

      for (i=-1, len = S.length; ++i < len;) {
        var nodeIndex = S[i],
            nn = nodes[nodeIndex];

        D[nodeIndex] = j;
        nn.depth = j;

        groupsPerDimension[j].push(nodeIndex);
        groupSums[j] += nn.value;
      }
      j+=1;

      while(S.length > 0) {
        node = S.shift();
        L.push(node);

        var edges = outgoingEdges[node];
        for(i=-1, len=edges.length; ++i < len;) {
          var m = edges[i],
              incomingToM = incomingEdges[m];

          //remove this edge from consideration
          incomingToM.splice(incomingToM.indexOf(node), 1);
          if (incomingToM.length == 0) {
            S.push(m);
            var depth = D[node] + 1;
            D[m] = depth;
            nodes[m].depth = depth;

            if (!groupSums[depth]) groupSums[depth] = 0;
            groupSums[depth] += nodes[m].value;

            if (!groupsPerDimension[depth]) groupsPerDimension[depth] = [];
            groupsPerDimension[depth].push(m);

            maxGroupsPerDimension = d3.max([maxGroupsPerDimension, groupsPerDimension[depth].length]);
          }
        }

      }
      maxDepth = d3.max(D) + 1;

      nodes.sort(function(a,b) {
        return a.depth - b.depth;
      });
    }

    // nodes are ordered. Update them and calculate the scales
    xScale.domain( d3.range(maxDepth) );

    var yScale = d3.scale.linear().domain([ 0, d3.max(groupSums) ]).range([0, height - (padding* (maxGroupsPerDimension-1))]);

    groupsPerDimension.forEach(function(grp, d) {
      var s = 0;

      grp.forEach(function(g, i) {
        var o = nodes[g];
        o.height = yScale(o.value);
        o.width = rectWidth;
        o.x = xScale(o.depth);

        if (i > 0) {
          o.order = nodes[grp[i-1]].order + 1;
          s += (padding + nodes[grp[i-1]].height);
        }

        o.y = s;

      });
    });

    var incomingSteps = {},
        outgoingSteps = {};

    flows.sort(function(a,b) {
      if (a.source.depth == b.source.depth)
      {
        if (a.source.index == b.source.index) {
          return a.target.order - b.target.order;
        }
        else if (a.target.index == b.target.index) {
          return a.source.order - b.source.order;
        }
        else return a.target.order - b.target.order;
      }
      else
        return a.source.depth - b.source.depth;
    });

    /*flows.sort(function(a, b) {
      if (a.source.index == b.source.index) {
        return a.target.order - b.target.order;
      }
      else if (a.target.index == b.target.index) {
        return a.source.order - b.source.order;
      }
      else return a.target.order - b.target.order;
    });*/

    flows.forEach(function(f, i) {
      var flowScale = d3.scale.linear().domain([0, f.source.value]).range([0, f.source.height]);
      f.height = flowScale(f.value);
      f.startx = f.source.x + f.source.width;
      f.endx = f.target.x;

      if (! outgoingSteps[f.source.index]) {
        outgoingSteps[f.source.index] = 0;
      }
      f.starty = f.source.y + outgoingSteps[f.source.index];

      if (! incomingSteps[f.target.index] ) {
        incomingSteps[f.target.index] = 0;
      }
      f.endy = f.target.y + incomingSteps[f.target.index];

      outgoingSteps[f.source.index] += f.height;
      incomingSteps[f.target.index] += f.height;
    });
  }

  sankey.matrix = function(m) {
    if (!arguments.length) return matrix;
    n = (matrix = m) && matrix.length;
    nodes = flows = null;
    return sankey;
  };

  sankey.nodes = function() {
    if (!nodes) relayout();
    return nodes;
  };

  sankey.flows = function() {
    if (!flows) relayout();
    return flows;
  };

  sankey.width = function(w) {
    if (!arguments.length) return width;
    width = w;
    nodes = flows = null;
    return sankey;
  };

  sankey.height = function(h) {
    if (!arguments.length) return height;
    height = h;
    nodes = flows = null;
    return sankey;
  };

  sankey.padding = function(p) {
    if (!arguments.length) return padding;
    padding = p;
    nodes = flows = null;
    return sankey;
  };

  sankey.groupsPerDimension = function(g) {
    if (!arguments.length) return groupsPerDimension;
    groupsPerDimension = g;
    nodes = flows = null;
    return sankey;
  };

  return sankey;
};