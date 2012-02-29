//leaderboard.js
//when dom is ready
$(function() {

  //Styling and appearance
  var HOVER_DURATION = 1000;
  var CELL_WIDTH = 150;
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
    SYMBOL_STRING         : "s"
  };

  //var SAMPLE_DATA_URL = 'https://docs.google.com/spreadsheet/pub?key=0AjfLl-FLMak1dE5rcDZNQWlvQmRDVWhXUmd2OGhqT1E&single=true&gid=0&output=csv';
  //var SAMPLE_DATA_URL = 'https://docs.google.com/spreadsheet/pub?key=0AjfLl-FLMak1dE5rcDZNQWlvQmRDVWhXUmd2OGhqT1E&single=true&gid=1&output=csv';
  var SAMPLE_DATA_URL = 'data/nfl_combine.csv';

  var displayedColumns = [],
      data = [],
      leaderboard;
  //----------------------------------------------- handlers, util functions

  function addHandlers (){
    $('#search-form').submit(function (e) { searchItems(); return false; });
    $('#filter-form').submit(function (e) { filterItems(); return false; });

    $('#leaders').click(function (e) {updateSort(true); return false; });
    $('#laggards').click(function (e) {updateSort(false); return false; });
    $('#input-form').submit(function() { dataUpdated(); return false; });
  }


  function resetFilters(){
    $('.datafilter').remove();
    $('#filterInput').val('');
    $('#searchInput').val('');
  }


  //input text with raw data has been updated
  function dataUpdated(){
    resetFilters();

    var csv = $('#csv-data').val();
    data = d3.csv.parse(csv);
    var columns = findColumns(data);
    var key = columns[0].name;

    displayedColumns = _.rest(columns, 1);
    //all displayedColumns should be numeric, just double checking
    var numericColumns = _.filter(displayedColumns, function(column){return column.format !== null;});

    //convert columns to numerics
    _.each(data, function(row){
      _.each(numericColumns, function(column){
        row[column.name] = (!row[column.name] || row[column.name] === '') ? null : row[column.name] * 1;
      });
    });
    leaderboard.refresh({data: data, displayedColumns: displayedColumns, key: key});
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
    var columnName = _.find(_.keys(data[0]), function(colName){ return colName.toLowerCase().indexOf(rawColumnName) > -1; });

    //column name is invalid, skip it
    if(columnName === undefined)
      return;

    var newFilter = $(document.createElement('div'));
    var closeBtn = $('<a class = "close">&times;</a>');

    newFilter.append(closeBtn);
    newFilter.append(filterStr);
    newFilter.addClass('alert alert-info datafilter');
    newFilter.data('column', columnName);
    newFilter.data('value', $.trim(input[1]));
    newFilter.appendTo($('#applied-filters'));
    closeBtn.click(function(){
      newFilter.remove();
      filterData();
    });

    filterData();
  }


  function filterData(){
    var newData = data;
    var filters = $('.datafilter');
    _.each(filters, function(filterObj){
      var column = $(filterObj).data('column');
      var values = $(filterObj).data('value').toLowerCase().split(','); //QB,RB,OL

      var cleanValues = [];
      _.each(values, function(value){cleanValues.push($.trim(value).toLowerCase()); });

      newData = _.filter(newData, function(row){ return (_.include(cleanValues, row[column].toLowerCase()) );});
    });

    leaderboard.refresh({data: newData, displayedColumns: displayedColumns});
  }



  function updateSort(displayTop){
    leaderboard.refresh({"displayTop": displayTop});
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
    return columns;
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
      success: function(data) { $('#csv-data').val(data); $('#input-form').submit();},
      error: function(err) { }
    });
  }

  //-----------------------------------------------Start
  function start(){
    addHandlers();

    leaderboard = juice.leaderboard({
      numberOfDisplayedRows : DISPLAYED_ROWS,
      cellWidth             : CELL_WIDTH,
      key                   : "name",
      container             : "#leaderboard",
      displayedColumns      : displayedColumns,
      data                  : data,
      formats               : microformat
    });

    loadSampleData();
  }

  start();

});
