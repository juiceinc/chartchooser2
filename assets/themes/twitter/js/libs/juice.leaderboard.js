if(juice === undefined)
  var juice = {};

juice.leaderboard = function(conf){
  var _conf = conf || {};
  var
    leaderboard = {},
    numberOfDisplayedRows = _conf.numberOfDisplayedRows || 5,
    cellWidth = _conf.cellWidth || 200,
    key = _conf.key || "name",
    container = _conf.container || "#leaderboard",
    displayTop = true,
    maxTitleLength = 18,

    formats = _conf.formats || {
                          SYMBOL_FLOAT          : "d",
                          SYMBOL_INT            : "i",
                          SYMBOL_CURRENCY       : "$",
                          SYMBOL_PERCENT        : "%",
                          SYMBOL_STRING         : "s",
                          SYMBOL_NAN            : "--"
                        },

    data = _conf.data || {},
    displayedColumns = conf.displayedColumns,

    columns,
    cells
  ;

  function NaNOrFormat(d, f){
    if( isNaN(d) )
      return formats.SYMBOL_NAN;
    return (typeof(f) === 'function') ? f(d) : f;
  }

  var getFormatter = function (format){
    switch(format){
      case formats.SYMBOL_INT      : return {'format': function(d) { return NaNOrFormat(d,  d3.format(",.0f")); }};
      case formats.SYMBOL_CURRENCY : return {'format': function(d) { return NaNOrFormat(d, "$" + d3.format("0,.2f")(d)); }};
      case formats.SYMBOL_FLOAT    : return {'format': function(d) { return NaNOrFormat(d, d3.format("0,.2f")); }};
      case formats.SYMBOL_PERCENT  : return {'format': function(d) { return NaNOrFormat(d, d3.format("%")); }};
      default                      : return {'format': function(d) { return d; }};
    }
  };



  init();


  leaderboard.refresh = function (conf){
    if(conf.displayTop !== undefined)
      displayTop = conf.displayTop;

    if(conf.displayedColumns !== undefined)
      displayedColumns = conf.displayedColumns;

    if(conf.data !== undefined)
      data = conf.data;

    if(conf.key !== undefined)
      key = conf.key;

    if(conf.numberOfDisplayedRows !== undefined)
      numberOfDisplayedRows = conf.numberOfDisplayedRows;



    if(conf.displayedColumns !== undefined ||
      conf.numberOfDisplayedRows !== undefined)
      //columns or displayed rows have changed, recreate leaderboard
      init();
    else
      //only cells have changed, just refresh them
      reloadCells();
  };

  //select cells by partially matching the first occurrence of keyValue
  leaderboard.selectByKey = function (keyValue){
    cells.classed('selected', false);
    if(!keyValue || keyValue.length === 0)
      return;

    keyValue = keyValue.toLowerCase();

    var matchedValue = null;

    //find the first occurrence of the searched keyValue
    var selectedCells = cells.select(function(d, i) {
      if(matchedValue){
        //enforce strict matching for others since we already found the first matched cell
        return d[key] == matchedValue ? this : null;
      }
      else{
        if(d[key].toLowerCase().indexOf(keyValue) > -1){
          matchedValue = d[key];
          return this;
        }
        else return null;
      }
    });
    selectedCells.classed('selected', true);
  };

  //removes styles attribute
  function removeStyles (el, properties) {
      if (properties)
          properties.foreach(function (prop) {el.style(prop, null);});
      else
          el.attr('style', null);
  }

  //animates selection to hovered state (used for "out of range" cells)
  function animateToHovered(selection){
      if(selection.empty() || selection.classed('selected')) return;

      var _height = selection.style('height');

      selection.style('height', '0px');
      selection.style('opacity', 0.5);

      selection
          .transition()
              .duration(100)
              .style('height', _height)
          .transition()
              .delay(100)
              .duration(300)
              .style('opacity', 1)
          //remove animated properties
          .each('end', function (d, i) { removeStyles ( d3.select(this)); })
      ;
  }

  //animates selection to selected state (used for "out of range" cells)
  function animateToSelected(selection){

      if(selection.empty()) return;

      var _bgcolor = selection.style('background-color');
      var _color = selection.style('color');

      //it starts with hovered colors
      //FIXME: find a way to get hovered colors
      //selection.style('background-color', '#DFDFDF');
      //selection.style('color', '#404040');

      //animate to selected colors
      selection
          .transition()
              .duration(500)
              .style('background-color', _bgcolor)
              .style('color', _color)
          //remove animated properties
          .each('end', function (d, i) { removeStyles ( d3.select(this)); })
      ;
  }

  //rank format function (returns 1st, 23rd, etc..)
  function rank(num){
    //if (num === 0) return "0";
    switch (num % 100){
        case 11:
        case 12:
        case 13:
        return num + "th";
    }
    switch (num % 10){
        case 1: return num + "st";
        case 2: return num + "nd";
        case 3: return num + "rd";
    }
    return num + "th";
  }

  function init(){

      // FIXME : don't set explicit height
      d3.select(container).style('height', (numberOfDisplayedRows * 25 + 30 + 70) + 'px');

      //Columns
      columns = d3.select(container)
          .selectAll(".leaderboard-column")
             .data(displayedColumns)
             .text(function(d){ return d['label'];})
             ;

      //Enter
      columns.enter()
          .append("div")
          .style("width", function (d, i) { return cellWidth +"px"; })
          .style("left", function (d, i) { return i * cellWidth +"px"; })
          .classed("leaderboard-column", true)
          .text(function(d){ return d['label']; })
          ;
      //Exit
      columns.exit()
          .remove();

      //Cells
      reloadCells();

      //Enter
      cells.enter()
          .append('div')
          .classed("leaderboard-cell", true)
          .classed('cell-out-of-range', function(d, i){
              return i >= numberOfDisplayedRows;
          })
          .classed('no-data', function(d, i, j){
            var myColumn = displayedColumns[j];
            return isNaN(d[myColumn.name]);
          })
          ;
      //Exit
      cells.exit()
          .remove();

      //cell title
      cells.append('div')
          .classed("title", true)
          .text(function(d,i,j) {
            var title = d[key];
            if(title.length > maxTitleLength)
              title = title.substr(0, maxTitleLength-2);

            return title;
          });

          //rank
          cells.append('div')
              .classed("rank", true)
              .text(function(d,i,j) {
                  return rank(i+1);
          });
          //value
          cells.append('div')
              .classed("value", true)
              .text(function(d,i,j) {
                var myColumn = displayedColumns[j];
                return getFormatter(myColumn.format).format(d[myColumn.name]);
              })
          ;


      //------------------------Cell Event handlers
      //Cell click
      cells.on("click", function(d, i){

          //deselect all
          cells.classed('selected', false);

          //select relevant ones
          var selected = cells.filter(function(cellData){ return d === cellData;})
              .classed('selected', true)
              ;

          //animate color for those out of range
          columns.selectAll('.leaderboard-cell.cell-out-of-range.selected').call(animateToSelected);
      });

      //cell mouse over
      cells.on("mouseover", function(d, i){
               var hovered = cells.filter(function(cellData){ return d === cellData;})
                      .classed('hovered', true)
                      ;

                  //fade in those out of range
                  columns.selectAll('.leaderboard-cell.cell-out-of-range.hovered').call(animateToHovered);
      });

      //cell mouse out
      cells.on("mouseout", function(d, i){
              var hovered = cells.filter(function(cellData){ return d === cellData;})
                  .classed('hovered', false)
                  ;
          });
  }

  function ascendingIngoreNulls(a, b){
    if(typeof(a) !== 'number' || isNaN(a))
      return 1;

    if(typeof(b) !== 'number' || isNaN(b))
      return -1;

    return d3.ascending(a,b);
  }
  function descendingIngoreNulls(a, b){
    if(typeof(a) !== 'number' || isNaN(a))
      return 1;

    if(typeof(b) !== 'number' || isNaN(b))
      return -1;

    return d3.descending(a,b);
  }

  function applySort(moreIsBetter, columnName, a, b){
    return ((displayTop && moreIsBetter) || (!displayTop && !moreIsBetter)) ?
                descendingIngoreNulls(a[columnName], b[columnName]) :
                ascendingIngoreNulls(a[columnName], b[columnName]);
  }

  function reloadCells(){
      //Cells
      cells =
          columns.selectAll(".leaderboard-cell")
              .data(
                function(displayedColumn){
                  //data sorted by the current displayedColumn
                  return data.sort(function(a, b){
                    return applySort(displayedColumn.moreIsBetter, displayedColumn.name, a, b);
                  });
                },
                function (d) { return d[key]; }
              )
              .classed('cell-out-of-range', function(d, i){
                return i >= numberOfDisplayedRows;
              })
              ;

      cells.order();
  }

  return leaderboard;
};