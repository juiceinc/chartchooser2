//leaderboard.js
//when dom is ready
$(function() {

  var DISPLAYED_ROWS = 5;
  var HOVER_DURATION = 1000;
  var CELL_WIDTH = 150;
  var NUM_COLUMNS = 6;
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


  function dataUpdated(){
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


  function findColumns(data){
    var columns = []; //array of {name: "abc[1/-]", label:"abc",  }

    var rawColumns = _.keys(data[0]);
    var specialColumns = _.filter(rawColumns, function(col){
      return col && col.indexOf('[') > -1 && col.indexOf(']') > -1;
    });

    //process special columns
    _.each(specialColumns, function(col){

      var microFormat = col.substring(col.lastIndexOf('['), col.lastIndexOf(']'));//.split('/');

      var columnFormat = {
        name       : col,
        label         : col.substring(0, col.lastIndexOf('[')),
        moreIsBetter  : microFormat.indexOf('-') == -1,
        order         : 100000,
        format        : null
      };

      //order
      var numbers = microFormat.match(/\d+/g); //get the numbers, returned in array
      if(! isNaN(numbers[0] * 1) )
        columnFormat.order = numbers[0] * 1;

      //int
      if(microFormat.indexOf('i') > -1)
        columnFormat.format='i';
      //money
      else if(microFormat.indexOf('m') > -1)
        columnFormat.format='m';
      //float
      else if(microFormat.indexOf('f') > -1)
        columnFormat.format='f';
      //percentage
      else if(microFormat.indexOf('%') > -1)
        columnFormat.format='p';

      columns.push(columnFormat);
    });

    //add non-special columns
    var nonSpecialColumns = _.difference(rawColumns, specialColumns);
    var i = 0;
    while(columns.length < NUM_COLUMNS)
    {
      var columnFormat = {
        name       : nonSpecialColumns[i],
        label         : nonSpecialColumns[i],
        moreIsBetter  : true, //default is more is better
        order         : 100000 + i,
        format        : 'i' //default is int
      };

      if(columns[0].format !== null){
        columnFormat.format = null;
        columns.unshift(columnFormat);
      }
      else
        columns.push(columnFormat);
      i++;
    }

    //sort by order
    columns = _.sortBy(columns, function(column){ return column.order; });
    _.each(columns, function (column, index) {
      if(index === 0)
        column.format = null;
      else if(column.format === null)
        column.format = 'i';
    });

    return columns;
  }



  //----------------------------------------------- Data

  function loadSampleData(){
      // for ( var num in d3.range(DATA_SIZE)){
      //     var datum = {name: "Name "+ num};
      //     for( var i in displayedColumns){
      //         datum[displayedColumns[i].name] = Math.random() * 100000;
      //         if(Math.random()  > 0.7 )
      //           datum[displayedColumns[i].name] =  null;
      //     }
      //     data.push(datum);
      // }

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
        numberOfDisplayedRows: 5,
        cellWidth: CELL_WIDTH,
        key: "name",
        container : "#leaderboard",
        displayedColumns: displayedColumns,
        data: data
      });

      loadSampleData();

  }
  start();

});
