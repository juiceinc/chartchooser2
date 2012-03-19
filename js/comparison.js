//comparison.js
//when dom is ready
$(function() {

  var SAMPLE_DATA_URL = 'data/nfl_combine.csv',
      NUM_COLUMNS = 2, //minimum of metrics to display
      MAX_ROWS_CSV = 500; //max number of rows to process from text input

  var
      rawData = [], //JSON representation of what's in the input box
      data = [], //rawData grouped by the key
      key = 'name', //key column
      displayedColumns = [], //columns to be displayed
      summaryLeft = {},
      summaryRight = {},
      du = $(this).datautils(),
      matchUpChart, //a d3 chart that matches the metric values on either sides
      datasetID = -1
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

    // show/hide match-up
    $('#chart').on('mouseenter',function(){
       $('#chart-match-up').fadeIn(500);
     });
    $('#chart').on('mouseleave',function(){
       $('#chart-match-up').fadeOut(500);
     });
  }

  //input text with raw data has been updated
  function updateData(){
    var csv = $('#csv-data').val();

    rawData = d3.csv.parse(csv);
    rawData = rawData.slice(0,MAX_ROWS_CSV);

    var oldKey = key;
    var oldColumns = displayedColumns;

    //find key and metric columns
    var columns = du.datautils('findColumns', rawData);
    if(columns.length > 1){
      //first column is a key column, all others are displayable metric columns
      displayedColumns = columns.slice(1);

      //the first column is always a key column
      key = columns[0].name;
    }

    //group rawData by the key
    data = du.datautils('groupby', rawData, key, displayedColumns);
    datasetID = new Date().getTime();

    //update key dropdown selectors
    if(oldKey !== key)
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
    var uniqueKeyValues = du.datautils('unique', data, key);
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
        'metricLabel' : column.label,
        'metricName' : column.name,
        'leftValue' : summaryLeft[column.name],
        'rightValue' : summaryRight[column.name]
      };
      obj.diff = obj.leftValue - obj.rightValue;

      var relativeDiff = (column.moreIsBetter) ? obj.diff : -1 * obj.diff;

      if(relativeDiff > 0) {
        obj.leftClassName = 'winner' ;
        obj.rightClassName = 'loser' ;
        obj.diffClassName = 'positive' ;
      }
      else if(relativeDiff < 0) {
        obj.leftClassName = 'loser' ;
        obj.rightClassName = 'winner' ;
        obj.diffClassName = 'negative' ;
      }
      else {
        obj.leftClassName = 'tied' ;
        obj.rightClassName = 'tied' ;
        obj.diffClassName = 'tied' ;
      }
      //format values
      obj.leftValue = du.datautils('format', obj.leftValue, column.format, d3.format);
      obj.rightValue = du.datautils('format', obj.rightValue, column.format, d3.format);
      obj.diff = du.datautils('format', obj.diff, column.format, d3.format, true);

      comparisons.push( obj );
    });

    return comparisons;
  }


  //refreshes the chart
  function refreshChart(comparisons){

    //remove all handlers
    $('.comparison-cell').off();

    var temp =
    '<div class="row comprarison-row">' +

      '<div class="span3 comparison-cell {{leftClassName}} center" data-metric="{{metricName}}">' +
        '<div class="title"> {{metricLabel}} </div>' +
        '<div class="value"> {{leftValue}} </div>' +
      '</div>' +

      '<div class="span4 value {{diffClassName}} center"> {{diff}} </div>' +

      '<div class="span3 comparison-cell {{rightClassName}} center" data-metric="{{metricName}}">' +
        '<div class="title"> {{metricLabel}} </div>' +
        '<div class="value"> {{rightValue}} </div>' +
      '</div>' +

    '</div>';

    var template = _.template(temp);

    var html = '';

    _.each(comparisons, function (comparison){
      html +=  template(comparison);
    });
    $('#chart').html(html);

    //add mouse over/out handlers to add hovered effect
    $('.comparison-cell').on('mouseenter',function(){
      var metricName = $(this).data('metric');
      $('.comparison-cell[data-metric="'+metricName+'"]').addClass('hovered');

      //find metric column
      var metricColumn = _.find(displayedColumns, function(column){return column.name === metricName; });

      //update chart
      matchUpChart.update(data, metricColumn, summaryLeft, summaryRight, datasetID);
    });

    $('.comparison-cell').on('mouseleave',function(){
      var metricName = $(this).data('metric');
      $('.comparison-cell[data-metric="'+metricName+'"]').removeClass('hovered');
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

    //chosen plugin
    $(".chzn-select").chosen();

    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };

    matchUpChart = juice.comparison({
      container             : "#chart-match-up"
    });

    addHandlers();
    loadSampleData();
  }

  start();

});
