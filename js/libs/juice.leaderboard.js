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
    modeASC = false,

    data = _conf.data || {},
    columnObj = conf.columnObj || {},

    columns,
    cells
  ;

  //TODO: externalize or remove
  //money format function
  var number = d3.format("0,.2f");

  init();
  

  leaderboard.refresh = function (conf){
    if(conf.modeASC !== undefined)
      modeASC = conf.modeASC;

    if(conf.columnObj !== undefined)
      columnObj = conf.columnObj;

    if(conf.data !== undefined)
      data = conf.data;

    if(conf.key !== undefined)
      key = conf.key;



    if(conf.columnObj !== undefined)
      //columns have changed, recreate leaderboard
      init();
    else
      //only cells have changed, just refresh them
      reloadCells();
  };

  leaderboard.selectByKey = function (keyValue){
    cells.classed('selected', false);

    cells.filter(function(cellData){return cellData[key].toLowerCase() === keyValue.toLowerCase();})
        .classed('selected', true);
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
      if(selection.empty()) return;
      
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
      d3.select(container).style('height', numberOfDisplayedRows * 60 + 30 + 'px');

      //Columns
      columns = d3.select(container)
          .selectAll(".leaderboard-column")
             .data(columnObj)
             .text(function(d){ return d['name'];})
             ;

      //Enter
      columns.enter()
          .append("div")
          .style("width", function (d, i) { return cellWidth +"px"; })
          .style("left", function (d, i) { return i * cellWidth +"px"; })
          .classed("leaderboard-column", true)
          .text(function(d){ return d['name']; })
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
          ;
      //Exit
      cells.exit()
          .remove();

      //cell title
      cells.append('div')
          .classed("title", true)
          .text(function(d,i,j) {
              return d[key];
          });

      //cell rank+value container
      var vals = cells.append('div')
              .classed("val-container", true);
          //rank
          vals.append('div')
              .classed("rank", true)
              .text(function(d,i,j) {
                  return rank(i+1);
          });
          //value
          vals.append('div')
              .classed("value", true)
              .text(function(d,i,j) {
                  return (columnObj[j].numeric) ? number(d[columnObj[j].name]) : d[columnObj[j].name];//money(d[columnObj[j].name]);
          });


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


  function reloadCells(){
      //Cells
      cells =
          columns.selectAll(".leaderboard-cell")
              .data(
                function(columnObj){
                  //data sorted by the current columnObj
                  return data.sort(function(a, b){
                      return modeASC ?
                        d3.ascending(a[columnObj[key]], b[columnObj[key]])
                        : d3.descending(a[columnObj[key]], b[columnObj[key]]);
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