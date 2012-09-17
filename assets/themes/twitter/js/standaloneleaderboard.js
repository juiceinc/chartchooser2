//leaderboard.js

// an AJAX callback function reference, will be defined before the AJAX call
var onDataLoad;

//when dom is ready

$(function() {

  //Styling and appearance
  var CELL_WIDTH = 200,
      MAX_ROWS_CSV = 500000, //max number of rows to process from text input
      du = $(this).datautils({'numberOfColumnsToProcess': 5, 'maxHeaderLength': 15}),
      FETCH_DATA_URL = 'http://chartchooser-files.s3-website-us-east-1.amazonaws.com/',
      SAMPLE_DATA_HASH = '#fb16d423734257c7d5f332c62bdab58a',
      SAVE_DATA_SERVICE_URL = 'http://ec2-23-20-53-61.compute-1.amazonaws.com/upload',
      SYMBOL_STRING = "s",
      saveTemplate = ($('#save-template').length) ? _.template($('#save-template').html()) : '',
      shareTemplate = ($('#share-template').length) ? _.template($('#share-template').html()) : ''
    ;

  //variables
  var displayedColumns = [],
      data = [],
      leaderboard;
  //----------------------------------------------- handlers, util functions

  function addHandlers (){
    $('#search-form').submit(function (e) { searchItems(); return false; });
    $('#filter-form').submit(function (e) { filterItems(); return false; });

    $('#leaderboard-show').change(function (e) {
      updateSort();
      updateVisibleItems();
    });
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
        saveCurrentData(function(url)
          {
            $('.modal-body').html(saveTemplate({'url': url}));
          }
        );
        return false; //prevent refresh
    });

    $('#share-data-btn').click(function() {
        $('#clear-data-btn').removeClass('btn-info');

        saveCurrentData(function(url)
        {
          //pattern that matches the html file name in the URL
          var pattern = /\/([a-z]*)(\.html#[a-z0-9]+)/

          //replace /leaderboard.html with /standalone_leaderboard.html
          $('.modal-body').html(shareTemplate({'url':url.replace(pattern, "/standalone_$1$2")}));
        });

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
      $(this).blur();
    });
  }

  //updates leaderboard divider text and position
  function updateLabels(conf){
    //total rows text
    if(conf && conf.data){
      var totalText = conf.data.length > 0 ? 'out of '+ conf.data.length + ' players' : 'No data available';
      $('#total-population').text(totalText);
    }

    //direction in the leaderboard divider line
    $('.divider-direction').text($('#leaderboard-show').val().split(' ')[0]);

    //num of visible rows  and position of the leaderboard divider line
    var numberOfDisplayedRows = $('#leaderboard-show').val().split(' ')[1] * 1;
    $('.divider-visible-rows-number').text(numberOfDisplayedRows);
    $('#leaderboard-divider').css({'top': (numberOfDisplayedRows +1 /*header*/) * 25 /*row height*/});
    if( conf.displayedColumns ) {
      $('#leaderboard-divider').css({'width': conf.displayedColumns.length * CELL_WIDTH + 10,
                                     'display': conf.displayedColumns.length ? 'block' : 'none'});
    }
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

    var displayTop = $('#leaderboard-show').val().split(' ')[0] == 'top';

    refreshLeaderboard({"data": data,
                        "displayedColumns": displayedColumns,
                        "key": key,
                        "numberOfDisplayedRows": +$('#leaderboard-show').val().split(' ')[1],
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
        , "numberOfDisplayedRows": +$('#leaderboard-show').val().split(' ')[1]});
  }

  function refreshLeaderboard(conf){
    leaderboard.refresh(conf);

    updateLabels(conf);
  }

  function updateSort(){
    var displayTop = $('#leaderboard-show').val().split(' ')[0] == 'top';
    refreshLeaderboard({"displayTop": displayTop});
  }

  function updateVisibleItems(){
    var rows = $('#leaderboard-show').val().split(' ')[1];
    refreshLeaderboard({"numberOfDisplayedRows": rows});
  }

  //----------------------------------------------- Data


  //override the global data callback handler
  onDataLoad = function(data){
    $('#csv-data').val(data.data);

    //set top or bottom
    var leaderboardval = ['top', '10'];
    if(data.topOrBottom)
      leaderboardval[0] = data.topOrBottom;

    //set number of displayed rows
    if(data.numDisplayed)
      leaderboardval[1] = data.numDisplayed;


    $('#leaderboard-show').val(leaderboardval.join(' '));

    //set title
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



  function saveCurrentData(constructURLFx){

    var data = $('#csv-data').val();
    var topOrBottom = $('#leaderboard-show').val().split(' ')[0];
    var numDisplayed = $('#leaderboard-show').val().split(' ')[1];
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

          if (typeof(constructURLFx)==='function')
            constructURLFx(window.location.href) ;

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
      numberOfDisplayedRows : +$('#leaderboard-show').val().split(' ')[0],
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
