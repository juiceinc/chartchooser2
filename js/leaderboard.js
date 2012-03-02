//leaderboard.js
//when dom is ready
$(function() {

  //Styling and appearance
  var HOVER_DURATION = 1000;
  var CELL_WIDTH = 162;
  var NUM_COLUMNS = 5;
  var DISPLAYED_ROWS = 5; //TODO: make dynamic

  //header microformat symbols
  var microformat= {
    SYMBOL_PRIMARY_KEY    : "*",
    SYMBOL_REVERSE_ORDER  : "-",
    SYMBOL_FLOAT          : "d",
    SYMBOL_INT            : "i",
    SYMBOL_CURRENCY       : "$",
    SYMBOL_PERCENT        : "%",
    SYMBOL_STRING         : "s",
    SYMBOL_NAN            : "--"
  };

  //var SAMPLE_DATA_URL = 'https://docs.google.com/spreadsheet/pub?key=0AjfLl-FLMak1dE5rcDZNQWlvQmRDVWhXUmd2OGhqT1E&single=true&gid=0&output=csv';
  //var SAMPLE_DATA_URL = 'https://docs.google.com/spreadsheet/pub?key=0AjfLl-FLMak1dE5rcDZNQWlvQmRDVWhXUmd2OGhqT1E&single=true&gid=1&output=csv';
  var SAMPLE_DATA_URL = 'data/nfl_combine.csv';

  var displayedColumns = [],
      data = [],
      allColumnsMetaData = [],
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
        loadSampleData();
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
    var originalLen = data.length;
    if (originalLen > 500) {
        data = data.slice(0,500);
    }

    allColumnsMetaData = findColumns(data);
    var key = allColumnsMetaData[0].name;

    displayedColumns = _.rest(allColumnsMetaData, 1);
    //all displayedColumns should be numeric, just double checking
    var numericColumns = _.filter(displayedColumns, function(column){return column.format !== microformat.SYMBOL_STRING;});

    //convert columns to numerics
    _.each(data, function(row){
      _.each(numericColumns, function(column){
        //convert to number or NaN
        row[column.name] = (!row[column.name] || row[column.name] === '') ? NaN : row[column.name] * 1;
      });
    });
    refreshLeaderboard({data: data, displayedColumns: displayedColumns, key: key});
  }

  function searchItems(){
    var searchStr = $('#searchInput').val();
    leaderboard.selectByKey(searchStr);
  }

  function filterItems(){
    var filterStr = $('#filterInput').val();
    $('#filterInput').val('');

    var input = filterStr.split(':');
    if(input.length != 2)
      return;

    var rawColumnName = $.trim(input[0].toLowerCase());
    var columnName = _.find(_.keys(data[0]), function(colName){ return colName.toLowerCase().indexOf(rawColumnName) === 0; });

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

      //find a user friendly column name, if available
      var displayedColumn = _.find(allColumnsMetaData, function(column){ return column.name === columnName; });
      var niceColumnName =  displayedColumn && displayedColumn.name ? displayedColumn.label : columnName;


      newFilter.append(closeBtn);
      newFilter.append($('<span>'+ niceColumnName + ': ' + $.trim(input[1]) + '</a>'));
      newFilter.addClass('alert alert-info span3 datafilter');
      newFilter.attr('data-column', columnName);
      newFilter.attr('data-value', $.trim(input[1]));
      newFilter.appendTo($('#applied-filters'));
      closeBtn.click(function(){
        newFilter.remove();
        filterData();
      });
    }
    filterData();
  }


  function filterData(){
    var newData = data;
    var filters = $('.datafilter');
    _.each(filters, function(filterObj){
      var column = $(filterObj).attr('data-column');
      var values = $(filterObj).attr('data-value').toLowerCase().split(','); //QB,RB,OL

      var cleanValues = [];
      _.each(values, function(value){cleanValues.push($.trim(value).toLowerCase()); });

      newData = _.filter(newData, function(row){ return (_.include(cleanValues, (row[column]+'').toLowerCase()) );});
    });

    refreshLeaderboard({data: newData, displayedColumns: displayedColumns});
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

  function getBlankColumnMetadata(name){
    return {
      name          : name,
      label         : name,
      moreIsBetter  : true,
      order         : 10000,
      format        : microformat.SYMBOL_INT
    };
  }

  function findColumns(data){
    var columns = []; //array of {name: "abc[1-]", label:"abc",  }

    var rawColumns = _.keys(data[0]);
    var specialColumns = _.filter(rawColumns, function(col){
      return col && col.indexOf('[') > -1 && col.indexOf(']') > -1;
    });

    //process special columns
    _.each(specialColumns, function(col){
      //parse header microformat, eg. myColumn[-3$]
      var headerFormat = col.substring(col.lastIndexOf('['), col.lastIndexOf(']'));

      var columnFormat = getBlankColumnMetadata(col);
      columnFormat.label = col.substring(0, col.lastIndexOf('['));

      //primary key
      if(headerFormat.indexOf(microformat.SYMBOL_PRIMARY_KEY) > -1){
        columnFormat.order = -1;
        columnFormat.format = microformat.SYMBOL_STRING;
        columnFormat.moreIsBetter = false;
      }
      else {
        //order
        var numbers = headerFormat.match(/\d+/g); //get all the numbers, returned as array
        if(numbers && !isNaN(numbers[0] * 1) ) //the first item is the order #
          columnFormat.order = numbers[0] * 1;

        //more is better ?
        columnFormat.moreIsBetter = headerFormat.indexOf('-') == -1;

        //money
        if(headerFormat.indexOf(microformat.SYMBOL_CURRENCY) > -1)
          columnFormat.format = microformat.SYMBOL_CURRENCY;
        //float
        else if(headerFormat.indexOf(microformat.SYMBOL_FLOAT) > -1)
          columnFormat.format = microformat.SYMBOL_FLOAT;
        //percentage
        else if(headerFormat.indexOf(microformat.SYMBOL_PERCENT) > -1)
          columnFormat.format=microformat.SYMBOL_PERCENT;
        //default is integer
        else
          columnFormat.format = microformat.SYMBOL_INT;
      }
      columns.push(columnFormat);
    });

    //add non-special columns
    var unprocessedColumns = _.difference(rawColumns, specialColumns);

    //find primary key column first if not already set
    var hasPrimaryKey = _.any(columns, function(column){return column.order === -1; /*only PK has order of -1*/});

    //add primary key if doesn't exist
    if(!hasPrimaryKey){
      var primaryKeyColumnName = findSpecificColumn(unprocessedColumns, data, nonNumericChecker);
      if(primaryKeyColumnName){
        var columnMetaData = getBlankColumnMetadata(primaryKeyColumnName);
        columnMetaData.moreIsBetter = false;
        columnMetaData.order = -1;
        columnMetaData.format = microformat.SYMBOL_STRING;

        columns.push(columnMetaData);
        unprocessedColumns = _.difference(unprocessedColumns, [primaryKeyColumnName]);
      }
      else{
        //leaderboard can't function properly without primary key
        return null;
      }
    }

    var i = 0;
    //fill in other numeric columns
    while(unprocessedColumns.length > 0 && columns.length <= NUM_COLUMNS )
    {
      var numericColumnName = findSpecificColumn(unprocessedColumns, data, numericChecker);
      if(numericColumnName)
      {
        var columnMetaData = getBlankColumnMetadata(numericColumnName);
        columnMetaData.order += i++;
        columns.push(columnMetaData);
        unprocessedColumns = _.difference(unprocessedColumns, [numericColumnName]);
      }
      else{
        //no more numeric columns left
        unprocessedColumns = [];
      }
    }

    //sort by order
    columns = _.sortBy(columns, function(column){ return column.order; });
    return columns.slice(0, NUM_COLUMNS+1);
  }

  //non numeric value checker
  function nonNumericChecker(value){
    return value ? isNaN(value * 1) : true;
  }

  //numeric value checker
  function numericChecker(value){
    return value ? !isNaN(value * 1) : true;
  }

  //finds the first column whose values (only a certain amount of) satisfy checkFunction
  function findSpecificColumn(columnNames, data, checkFunction){
    var SAMPLE_SIZE = 10;

    //check only first SAMPLE_SIZE items
    var sample = _.first(data, SAMPLE_SIZE);

    //find the first column that matches criteria
    return _.find(columnNames, function(columnName){
      var values = _.pluck(sample, columnName); //column values
      return _.any(values) /*at least one value should be valid*/ && _.all(values, checkFunction); //check if all values meet criteria
    });
  }


  //----------------------------------------------- Data

  function loadSampleData(){
    $.ajax({
      url: SAMPLE_DATA_URL,
      success: function(data) {
          $('#csv-data').val(data);
          updateData();
      },
      error: function(err) { }
    });
  }

  //-----------------------------------------------Start
  function start(){

    leaderboard = juice.leaderboard({
      numberOfDisplayedRows : $('#leaderboard-visible-rows').val() * 1,
      cellWidth             : CELL_WIDTH,
      key                   : "name",
      container             : "#leaderboard",
      displayedColumns      : [],
      data                  : [],
      formats               : microformat
    });

    if ( $.browser.msie && parseInt($.browser.version, 10) < 9) {
      $('#ie-user-warning').show();
    }
    else{
      $('#ie-user-warning').hide();
      addHandlers();
      loadSampleData();
    }
  }

  start();

});
