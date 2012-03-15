//comparison.js
//when dom is ready
$(function() {

  var SAMPLE_DATA_URL = 'data/nfl_combine.csv';
  var NUM_COLUMNS = 2; //minimum of metrics to display
  var MAX_ROWS_CSV = 500; //max number of rows to process from text input

  var
      rawData = [], //JSON representation of what's in the input box
      data = [], //rawData grouped by the key
      key = 'name', //key column
      displayedColumns = [], //columns to be displayed
      summaryLeft = {},
      summaryRight = {}
      ;
  //----------------------------------------------- handlers, util functions

  function addHandlers (){

    //data input change handler
    $('#csv-data').keyup(function(e) {
      // ignore arrow keys
      if (e.keyCode != 39 && e.keyCode != 37 && e.keyCode != 40 && e.keyCode != 38) {
          $('#clear-data-btn').addClass('btn-info');
          updateData();
      }
    });

    //left name change
    $('#left-names').change(function(){
      summaryLeft = getSummaryObject($("#left-names").val());
      updateChart();
    });

    //right name change
    $('#right-names').change(function(){
      summaryRight = getSummaryObject($("#right-names").val());
      updateChart();
    });
  }

  //input text with raw data has been updated
  function updateData(){
    var csv = $('#csv-data').val();

    rawData = d3.csv.parse(csv);
    rawData = rawData.slice(0,MAX_ROWS_CSV);

    //find key and metric columns
    var columns = $(this).datautils('findColumns', rawData);
    if(columns.length > 1){
      //first column is a key column, all others are displayable metric columns
      displayedColumns = columns.slice(1);

      //the first column is always a key column
      key = columns[0].name;
    }

    //group rawData by key
    data = $(this).datautils('groupby', rawData, key, displayedColumns);

    //update key dropdown selectors
    updateKeySelectors();

    summaryLeft = getSummaryObject($("#left-names").val());
    summaryRight = getSummaryObject($("#right-names").val());

    updateChart();

  }

  function updateChart() {
    var comparisons = createComparisons();
    refreshChart(comparisons);
  }

  function getSummaryObject(name) {
    var row = _.find (data, function (row) {return row[key] === name ;});
    return _.extend ({'name' : name}, row);
  }


  //updates the left and right name selectors
  function updateKeySelectors() {
    var uniqueKeyValues = $(this).datautils('unique', data, key);
    uniqueKeyValues.sort();
    var html = '';

    _.each(uniqueKeyValues, function (val){
      html +=  '\n<option> '+val+' </option>';
    });

    $('#left-names').html(html);
    $("#left-names").trigger("liszt:updated");

    $('#right-names').html(html);
    $("#right-names").trigger("liszt:updated");
  }

  //creates the comparisons array, each item is a single metric comparison
  function createComparisons(){
    var comparisons = [];

    _.each(displayedColumns, function(column){

      var obj = {
        'metricName' : column.label,
        'leftValue' : summaryLeft[column.name],
        'rightValue' : summaryRight[column.name]
      };
      obj.diff = obj.leftValue - obj.rightValue;

      if(obj.diff > 0) {
        obj.leftClassName = 'winner' ;
        obj.rightClassName = 'loser' ;
        obj.diffClassName = 'positive' ;
      }
      else if(obj.diff < 0) {
        obj.leftClassName = 'loser' ;
        obj.rightClassName = 'winner' ;
        obj.diffClassName = 'negative' ;
      }
      else {
        obj.leftClassName = 'tied' ;
        obj.rightClassName = 'tied' ;
        obj.diffClassName = 'tied' ;
      }
      comparisons.push( obj );
    });

    return comparisons;
  }


  //refreshes the chart
  function refreshChart(comparisons){

    var temp = '<div class="row-fluid show-grid comprarison-row">' +
      '<div class="span2 metric-title left"> {{metricName}} </div>' +
      '<div class="span3 {{leftClassName}} center"> {{leftValue}} </div>' +
      '<div class="span4 {{diffClassName}} center"> {{diff}} </div>' +
      '<div class="span3 {{rightClassName}} center"> {{rightValue}} </div>' +
    '</div>';

    var template = _.template(temp);

    var html = '';

    _.each(comparisons, function (comparison){
      html +=  template(comparison);
    });
    $('#chart').html(html);
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
    $(".chzn-select").chosen();

    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };

    addHandlers();
    loadSampleData();
  }

  start();

});
