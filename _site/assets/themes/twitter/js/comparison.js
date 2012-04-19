//comparison.js


// an AJAX callback function reference, will be defined before the AJAX call
var onDataLoad;


//when dom is ready
$(function() {

  var FETCH_DATA_URL = 'http://chartchooser-files.s3-website-us-east-1.amazonaws.com/',
      SAMPLE_DATA_HASH = '#7b42987e57dd070fa849b5899311ebb0',
      SAVE_DATA_SERVICE_URL = 'http://ec2-23-20-53-61.compute-1.amazonaws.com/upload',
      DIFF_MODE_ABSOLUTE = 'absolute',
      DIFF_MODE_PERCENTAGE = 'percentage',
      MAX_ROWS_CSV = 500; //max number of rows to process from text input

  var
      rawData = [], //JSON representation of what's in the input box
      data = [], //rawData grouped by the key
      key = 'name', //key column
      displayedColumns = [], //columns to be displayed
      summaryLeft = {},
      summaryRight = {},
      du = $(this).datautils({numberOfColumnsToProcess: 10}),
      matchUpChart, //a d3 chart that matches the metric values on either sides
      datasetID = -1,
      diffMode = DIFF_MODE_ABSOLUTE
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

    $('#clear-data-btn').click(function () {
      $('#clear-data-btn').removeClass('btn-info');
      loadSampleData();
      return false; //prevent refresh
    });

    $('#save-data-btn').click(function() {
        $('#clear-data-btn').removeClass('btn-info');
        saveCurrentData();
        return false; //prevent refresh
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
    $('#chart').hover(
      function(){
          $('.diff').css('opacity', 0);
       $('.match-up-overlay').fadeIn(500);
      },
      function(){
          $('.diff').css('opacity', 1);
       $('.match-up-overlay').fadeOut(300);
     });

    //absolute/percentage difference handler
    $('#absolute').click(function(){
      $('#percentage').removeClass('selected-diff-mode');
      $('#absolute').addClass('selected-diff-mode');

      diffMode = DIFF_MODE_ABSOLUTE;
      updateChart();

      return false;
     });
    $('#percentage').click(function(){
      $('#absolute').removeClass('selected-diff-mode');
      $('#percentage').addClass('selected-diff-mode');

      diffMode = DIFF_MODE_PERCENTAGE;
      updateChart();

      return false;
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
    $('#right-names').html(html);

    if(uniqueKeyValues.length > 1)
      $('#right-names').val(uniqueKeyValues[1]);

    $("#left-names").trigger("liszt:updated");
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

      var diffFormat;
      var relativeDiff;
      if(diffMode === DIFF_MODE_ABSOLUTE) {
        diffFormat = column.format;
        obj.diff = obj.leftValue - obj.rightValue;
        relativeDiff = (column.moreIsBetter) ? obj.diff : -1 * obj.diff;
      }
      else if (diffMode === DIFF_MODE_PERCENTAGE) {
        diffFormat = '%';
        obj.diff = ( obj.rightValue === 0 ) ? 1 : obj.leftValue/obj.rightValue - 1;
        relativeDiff = ( column.moreIsBetter ) ? obj.diff :  -1 * obj.diff;
      }


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
      obj.diff = du.datautils('format', obj.diff, diffFormat, d3.format, true /*enforce the sign*/);

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

      '<div class="span4 comparison-cell {{leftClassName}} center" data-metric="{{metricName}}">' +
        '<div class="title"> {{metricLabel}} </div>' +
        '<div class="value"> {{leftValue}} </div>' +
      '</div>' +

      '<div class="span4 value {{diffClassName}} center diff"> {{diff}} </div>' +

      '<div class="span4 comparison-cell {{rightClassName}} center" data-metric="{{metricName}}">' +
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

  //override the global data callback handler
  onDataLoad = function(data){
    $('#csv-data').val(data.data);

    //set number of displayed rows
    if(data.reportTitle)
      $('#report-title').text(data.reportTitle);

    //update data
    updateData();

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

    //chosen plugin
    $(".chzn-select").chosen();

    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };

    matchUpChart = juice.comparison({
      container             : "#chart-match-up"
    });

    addHandlers();
    loadData();
  }

  start();

});
