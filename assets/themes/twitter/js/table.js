
$(function(){
  var data,
      grid,
      columns = [],
      colWidth = 120,
      FETCH_DATA_URL = 'http://chartchooser-files.s3-website-us-east-1.amazonaws.com/',
      SAMPLE_DATA_HASH = '#358df037b92be0e2bdf069061275e570',
      currentHash,

      options = {
        enableCellNavigation: true,
        enableColumnReorder: false,
        rowHeight: 30,
        headerCssClass: "table-header"
      },

      appliedFilters = {},
      filteredRows = [],
      autocomplete,
      du = $(this).datautils();


  //override the global data callback handler
  onDataLoad = function(data){
    //console.log("data successfully loaded...");
    $('#csv-data').val(data.data);

     if(data.reportTitle)
      $('#report-title').text(data.reportTitle);

    //update data
    updateData();


    /*
    //set filters (should be applied AFTER the data is loaded, filters only work for applicable columns)
    if(data.filters) {
      _.each(data.filters, function(filterStr){
        addFilterItem(filterStr);
      });
      filterData();
    }   */
  };

  function updateData(){
    resetFilters();

    var csv = $('#csv-data').val();
    data = d3.csv.parse(csv);

    //add an id attribute to each row, required by slickgrid
    _.each(data, function(row, idx){
      row.id = "id_" + idx;
    });

    var columns = du.datautils('findTableColumns', data);

    if(columns.length > 0){
      var cWidth = columns[0].minWidth || colWidth;
      $('#table').css('width', cWidth * columns.length + 20);
    }

    refreshTable({"data": data,
                  "columns": columns,
                  "filters": appliedFilters
                  });
  }

  function refreshTable(conf){
    grid.updateDisplay(conf);
  }


  function resetFilters(){
    appliedFilters = {};

    $('#filter-grid').val("");
    $('.dataFilter').remove();
  }


  function loadData(){

    if(window.location.hash === '' || window.location.hash === '#')
      window.location.hash = SAMPLE_DATA_HASH;

    currentHash = window.location.hash;

    var hash = window.location.hash.replace('#', '');
    //data url is located under a separate folder that starts with the first letter of the hash
    //eg: 358df037b92be0e2bdf069061275e570 is stored under 3/358df037b92be0e2bdf069061275e570
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

  function addHashChangeHandler() {

    if ('onhashchange' in window) {
      $(window).bind('hashchange', checkUrl);
    }
    else
      _checkUrlInterval = setInterval(checkUrl, 50 /*ms interval*/);
  }

  function checkUrl(e) {

    if (currentHash == window.location.hash)
      return false;
    else loadData();
  }


  function filterData(columnName, values){
    var appFilters = appliedFilters,
        currentFilters = _.extend({}, appFilters);

    var colFilter = grid.getColumnByName(columnName),
        appliedColVal = currentFilters[colFilter] || "";

    currentFilters[colFilter] = values + ',' +  appliedColVal;
    grid.updateFilter(currentFilters);

    //grab the filtered rows, this will be used by the bootstrap typeahead to show the available options as user is applying filters.
    filteredRows = grid.getFilteredRows();
  }


  function updateAppliedFilters(columnName, values){
    var colFilter = grid.getColumnByName(columnName);

    if(_.has(appliedFilters, colFilter) && appliedFilters[colFilter]){
      var appVals = appliedFilters[colFilter];

      var valsArray = values.split(','),
          appValsArray = appVals.split(',');

      var newVals = _.union(valsArray, appValsArray).join();
      appliedFilters[colFilter] = newVals;
    }else {
      appliedFilters[colFilter] = values;
    }

    grid.updateFilter(appliedFilters);
  }


  function showAppliedFilters(){
    $('.dataFilter').remove();
    var curFilters = _.keys(appliedFilters);

    for(var idx=0; idx < curFilters.length; idx+=1){
     var newFilter = '<div class="alert alert-info fade in dataFilter" data-column="' + curFilters[idx] + '">' +
                      '<button class="close remove-filter" data-dismiss="alert">&times</button>' +
                        curFilters[idx] + " : " + appliedFilters[curFilters[idx]] +
                    '</div>';

      $('#applied-filters').append(newFilter);
    }

    $('#filter-grid').val("");
  }


  function start(){
    addHashChangeHandler();
    $('#filter-form').submit(function (e) { showAppliedFilters(); return false; });
    $('#filter-form').on('click', '.remove-filter', function(e){
      var col = $(this).parent().attr('data-column');
      delete appliedFilters[col];
      grid.updateFilter(appliedFilters);
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

    $('#filter-grid').change(function(e){
      var filter = $.trim($(this).val()),
           searchStr = "";

      if(filter.length > 0 && filter.indexOf(':') === -1){
        filter += ' : ';
        $(this).val(filter);
      }else {
        //text contains col and values, update the grid
        searchStr = filter.split(':');
        if(searchStr.length === 2)
        {
          var columnName = $.trim(searchStr[0]),
              values = $.trim(searchStr[1]);

          updateAppliedFilters(columnName, values);
        }
      }
    });

    //grab the autocomplete options and update the grid
    $("#filter-grid").keyup(function (e) {
      var filterText = this.value,
           cols = [],
           searchStr = filterText.split(':');

      // clear on Esc
      if (e.which == 27) {
        this.value = "";
      }

      //return on enter, change event handler will take care of updating the grid
      if(e.which == 13){
         return;
      }

      if(data && data.length > 0)
        cols = _.keys(data[0]);

       autocomplete.data("typeahead").source =  function(){
        if(filterText.indexOf(':') > -1){
          var filterColName = $.trim(searchStr[0]),
              filterColValueStr = searchStr.length > 1 ? $.trim(searchStr[1]).toLowerCase() : "";

          var filterColValues = filterColValueStr.split(',');

          var colValues = _.uniq(_.pluck(data, filterColName));
          //var colValues = _.uniq(_.pluck(filteredRows, filterColName));

          return _.filter(colValues, function(val){
            if(val === undefined) return false;

            return _.any(filterColValues, function(cv){
              return val.toLowerCase().indexOf($.trim(cv).toLowerCase()) > -1;
            });
          });

        }else {
          return _.filter(cols, function(col){
            return col.toLowerCase().indexOf(filterText.toLowerCase()) > -1;
          });
        }
      };

      if(searchStr.length !== 2)
        return;

      var columnName = $.trim(searchStr[0]),
          values = $.trim(searchStr[1]);

      if(values) filterData(columnName, values);

    });


    grid = juice.table({
      data: data,
      columns: columns,
      gridOptions: options
    });

    autocomplete = $('#filter-grid').typeahead({
      items: 20,
      matcher: function(item){
        return item;
      },
      updater: function(item){
        var filter = $('#filter-grid').val(),
            col,
            vals = "";

        if(filter.indexOf(':') > -1){
          var str = filter.split(':');

          col = $.trim(str[0]);
          if(str.length > 1 && str[1].indexOf(',') > -1){
            vals = $.trim(str[1]);
            vals = vals.substring(0, vals.lastIndexOf(',') + 1);
          }

          item = col + ' : ' + vals + item;
        }
        return item;
      }
    });

    loadData();
  }

  start();

});
