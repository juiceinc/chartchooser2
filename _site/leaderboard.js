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
//leaderboard.js

// an AJAX callback function reference, will be defined before the AJAX call
var onDataLoad;

//when dom is ready

$(function() {

  //Styling and appearance
  var CELL_WIDTH = 150,
      MAX_ROWS_CSV = 500, //max number of rows to process from text input
      du = $(this).datautils({'numberOfColumnsToProcess': 5, 'maxHeaderLength': 15}),
      FETCH_DATA_URL = 'http://chartchooser-files.s3-website-us-east-1.amazonaws.com/',
      SAMPLE_DATA_HASH = '#7b42987e57dd070fa849b5899311ebb0',
      SAVE_DATA_SERVICE_URL = 'http://ec2-23-20-53-61.compute-1.amazonaws.com/upload',
      SYMBOL_STRING = "s"
    ;

  //variables
  var displayedColumns = [],
      data = [],
      leaderboard;
  //----------------------------------------------- handlers, util functions

  function addHandlers (){
    $('#search-form').submit(function (e) { searchItems(); return false; });
    $('#filter-form').submit(function (e) { filterItems(); return false; });

    $('#leaderboard-direction').change(function (e) {updateSort(); });
    $('#leaderboard-visible-rows').change(function (e) {updateVisibleItems(); });
    $('#csv-data').keyup(function(e) {
        // Arrow keys
        if (e.keyCode != 39 && e.keyCode != 37 && e.keyCode != 40 && e.keyCode != 38) {
            $('#clear-data-btn').addClass('btn-info');
            updateData();
        }
    });

    $('#clear-data-btn').click(function() {
        $('#clear-data-btn').removeClass('btn-info');
        loadData();
        return false; //prevent refresh
    });

    $('#save-data-btn').click(function() {
        $('#clear-data-btn').removeClass('btn-info');
        saveCurrentData();
        return false; //prevent refresh
    });

    //unfocus editable title on enter
    $('.editable').keypress(function(e){
       var code = (e.keyCode ? e.keyCode : e.which);
       if(code == 13) { //Enter keycode
         e.preventDefault();
         $('.editable').mouseout();
       }
    });

    //unfocus editable title on mouse out
    $('.editable').mouseout( function(){
        if($(this).attr('contentEditable')){
          $(this).attr('contentEditable',false);
          $(this).blur();
        }
    });
  }

  //updates leaderboard divider text and position
  function updateLabels(conf){
    //total rows text
    if(conf && conf.data){
      var totalText = conf.data.length > 0 ? 'out of '+ conf.data.length + ' items' : 'No data available';
      $('#total-population').text(totalText);
    }

    //direction in the leaderboard divider line
    $('.divider-direction').text($('#leaderboard-direction').val());

    //num of visible rows  and position of the leaderboard divider line
    var numberOfDisplayedRows = $('#leaderboard-visible-rows').val() * 1;
    $('.divider-visible-rows-number').text(numberOfDisplayedRows);
    $('#leaderboard-divider').css('top', (numberOfDisplayedRows +1 /*header*/) * 25 /*row height*/);
  }

  function resetFilters(){
    $('.datafilter').remove();
    $('#filterInput').val('');
    $('#searchInput').val('');
  }


  //input text with raw data has been updated
  function updateData(){
    resetFilters();

    var csv = $('#csv-data').val();

    data = d3.csv.parse(csv);
    data = data.slice(0, MAX_ROWS_CSV);

    var columns = du.datautils('findColumns', data);
    var key = columns[0].name;

    displayedColumns = _.rest(columns, 1);

    //all displayedColumns should be numeric, just double checking
    var numericColumns = _.filter(displayedColumns, function(column){return column.format !== SYMBOL_STRING;});

    //convert columns to numerics
    _.each(data, function(row){
      _.each(numericColumns, function(column){
        //convert to number or NaN
        row[column.name] = (!row[column.name] || row[column.name] === '') ? NaN : row[column.name] * 1;
      });
    });

    var displayTop = $('#leaderboard-direction').val() == 'top';

    refreshLeaderboard({"data": data,
                        "displayedColumns": displayedColumns,
                        "key": key,
                        "numberOfDisplayedRows": $('#leaderboard-visible-rows').val(),
                        "displayTop": displayTop});
  }

  function searchItems(){
    var searchStr = $('#searchInput').val();
    leaderboard.selectByKey(searchStr);
  }



  function filterItems(){
    var filterStr = $('#filterInput').val();
    $('#filterInput').val('');

    addFilterItem(filterStr);
    filterData();
  }

  function addFilterItem(filterStr){
    var input = filterStr.split(':');
    if(input.length != 2)
      return;

    var rawColumnName = $.trim(input[0].toLowerCase());
    var columnName = _.find(_.keys(data[0]), function(colName){ return colName.toLowerCase().indexOf(rawColumnName) > -1; });

    //column name is invalid, skip it
    if(columnName === undefined)
      return;

    //before adding a new filter button, check if is already among existing ones
    var existingFilter = $('.datafilter[data-column="' + columnName + '"]');
    if( existingFilter.length > 0 ){
      var newValue = existingFilter.attr('data-value') + ',' + $.trim(input[1]);
      existingFilter.attr('data-value', newValue);
      var newText = $('span',existingFilter).text() + ', '+$.trim(input[1]);
      $('span',existingFilter).text(newText);
    }
    //add new filter button
    else{
      var newFilter = $(document.createElement('div'));
      var closeBtn = $('<a class = "close">&times;</a>');

      newFilter.append(closeBtn);
      newFilter.append($('<span>'+ columnName + ': ' + $.trim(input[1]) + '</a>'));
      newFilter.addClass('alert alert-info span2 datafilter');
      newFilter.attr('data-column', columnName);
      newFilter.attr('data-value', $.trim(input[1]));
      newFilter.appendTo($('#applied-filters'));
      closeBtn.click(function(){
        newFilter.remove();
        filterData();
      });
    }
  }


  function filterData(){
    var newData = data;
    var filters = $('.datafilter');
    _.each(filters, function(filterObj){
      var column = $(filterObj).attr('data-column');
      var values = $(filterObj).attr('data-value').toLowerCase().split(','); //QB,RB,OL

      var cleanValues = [];
      _.each(values, function(value){cleanValues.push($.trim(value).toLowerCase()); });

      newData = _.filter(newData, function(row){ return (_.include(cleanValues, row[column].toLowerCase()) );});
    });

    refreshLeaderboard({data: newData, displayedColumns: displayedColumns
        , "numberOfDisplayedRows": $('#leaderboard-visible-rows').val()});
  }

  function refreshLeaderboard(conf){
    leaderboard.refresh(conf);

    updateLabels(conf);
  }

  function updateSort(){
    var displayTop = $('#leaderboard-direction').val() == 'top';
    refreshLeaderboard({"displayTop": displayTop});
  }

  function updateVisibleItems(){
    refreshLeaderboard({"numberOfDisplayedRows": $('#leaderboard-visible-rows').val()});
  }

  //----------------------------------------------- Data


  //override the global data callback handler
  onDataLoad = function(data){
    $('#csv-data').val(data.data);

    //set top or bottom
    if(data.topOrBottom)
      $('#leaderboard-direction').val(data.topOrBottom);

    //set number of displayed rows
    if(data.numDisplayed)
      $('#leaderboard-visible-rows').val(data.numDisplayed);

    //set number of displayed rows
    if(data.reportTitle)
      $('#report-title').text(data.reportTitle);

    //update data
    updateData();

    //set filters (should be applied AFTER the data is loaded, filters only work for applicable columns)
    if(data.filters) {
      _.each(data.filters, function(filterStr){
        addFilterItem(filterStr);
      });
      filterData();
    }
  };

  function loadData(){

    if(window.location.hash === '' || window.location.hash === '#')
      window.location.hash = SAMPLE_DATA_HASH;

    var hash = window.location.hash.replace('#', '');
    var dataURL = hash.substr(0,1) + '/' + hash;

    //onDataLoad will get triggered from JSONP
    $.ajax({
      type: "GET",
      url: FETCH_DATA_URL + dataURL,
      dataType : "jsonp",
      jsonp: false,
      error: function(err) { }
    });
  }

  function loadSampleData(){
    $.ajax({
      url: 'data/nfl_combine.csv',

      success: function(data) {
        $('#csv-data').val(data);
        updateData();
      },
      error: function(err) { }
    });
  }



  function saveCurrentData(){

    var data = $('#csv-data').val();
    var topOrBottom = $('#leaderboard-direction').val();
    var numDisplayed = $('#leaderboard-visible-rows').val();
    var reportTitle = $('#report-title').text();
    var filters = [];

    _.each($('.datafilter'), function(filterObj){
      filters.push($(filterObj).attr('data-column') +':'+ $(filterObj).attr('data-value'));
    });

    var jsonData = JSON.stringify({"data": data, "topOrBottom": topOrBottom , "numDisplayed": numDisplayed
      , "filters": filters, "reportTitle": reportTitle});

    $.ajax({
        type: 'POST',
        url: SAVE_DATA_SERVICE_URL,
        crossDomain: true,
        data: jsonData,
        dataType: 'json',
        success: function(data) {
          window.location.hash = data.id;

          $('#currentURL').text(window.location.href);
          $('#save-succeed-alert').modal('show');
        },
        error: function (data, textStatus, errorThrown) {
            alert('POST failed.');
        }
    });

  }
  //-----------------------------------------------Start
  function start(){
    addHandlers();

    leaderboard = juice.leaderboard({
      numberOfDisplayedRows : $('#leaderboard-visible-rows').val() * 1,
      cellWidth             : CELL_WIDTH,
      key                   : "name",
      container             : "#leaderboard",
      displayedColumns      : [],
      data                  : []
    });

    loadData();
    //loadSampleData(); //this is to load the local sample data
  }

  start();

});


//leaderboard.js
//when dom is ready
$(function() {
    $('.popup').popover({});
    $('.popupbottom').popover({placement: 'bottom'});
});






