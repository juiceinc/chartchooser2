
if (juice === undefined)
  var juice = {};

juice.table = function (conf) {
  var _conf = conf || {},
      grid = {},
      slickgrid,
      dataView,
      sortcol,
      data = _conf.data || [],
      columns = _conf.columns || [],
      options = _conf.gridOptions || {},
      container = _conf.container || '#table',

   formats = _conf.formats || {
        SYMBOL_FLOAT:"d",
        SYMBOL_INT:"i",
        SYMBOL_CURRENCY:"$",
        SYMBOL_PERCENT:"%",
        SYMBOL_STRING:"s",
        SYMBOL_NAN:"--"
      };

  init();

  function init(){
    dataView = new Slick.Data.DataView();
    slickgrid = new Slick.Grid(container, dataView, columns, options);
    //slickgrid.setSelectionModel(new Slick.RowSelectionModel());

    // wire up model events to drive the grid
    dataView.onRowCountChanged.subscribe(function (e, args) {
      slickgrid.updateRowCount();
      slickgrid.render();
    });

    dataView.onRowsChanged.subscribe(function (e, args) {
      slickgrid.invalidateRows(args.rows);
      slickgrid.render();
    });


    //add event handlers
    slickgrid.onSort.subscribe(function(e, args){ // args: sort information.
      sortcol = args.sortCol.field;
      dataView.sort(compare, args.sortAsc);
    });

    //initialize the model after all the events have been hooked up
    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.setFilterArgs({
      filters: {}
    });
    dataView.setFilter(dataFilter);
    dataView.endUpdate();


    $('.leaderboard-table').on('mouseenter', '.slick-row', function(e){
      $('.rank', this).show();
    });

     $('.leaderboard-table').on('mouseleave', '.slick-row', function(e){
      $('.rank', this).hide();
    });

  }

  //filter function
  function dataFilter(item, args){
    var filters = args.filters,
        columns = _.keys(filters);

    if(filters && columns.length > 0){

      for(var idx=0; idx<columns.length; idx+=1){
        var currentFilterCol = columns[idx],
            currentFilterValues = filters[currentFilterCol];

        if(!currentFilterCol) return false;

        if(currentFilterValues){
          var values = currentFilterValues.split(',');
          values = _.without(values, "");

          var match = _.find(values, function(val){
            return item[currentFilterCol].toLowerCase().indexOf($.trim(val).toLowerCase()) > -1;
          });

          if(match === undefined)
            return;
        }
      }

      return true;
    }

    return true;
  }

  grid.updateFilter = function(filters) {
    dataView.setFilterArgs({filters: filters});
    dataView.refresh();
  };


  grid.updateDisplay = function (conf){
    if(conf && conf.columns && conf.columns.length > 0){
      _.each(conf.columns, function(col){
        if(col.format !== formats.SYMBOL_STRING)
          col.formatter = customCellFormatter;
      });

      columns = conf.columns;
    }

    var f = conf.filters || {},
        processedData = [];

    if(conf && conf.data){
      var d = conf.data;
      data = calculateRanks(d);
    }

    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.setFilterArgs({filters: f});
    dataView.endUpdate();

    slickgrid.setColumns(columns);

    resetSortIndicator();
  };

  grid.getColumnByName = function(colStr){
    if(!colStr) return;

    if(data && data.length > 0){
      var cols = _.keys(data[0]);

      return _.find(cols, function(col){
          return col.toLowerCase().indexOf(colStr.toLowerCase()) > -1;
      });
    }
  };

  grid.getFilteredRows = function(){
    //console.log("Filtered rows: "+dataView.getLength());

    var rowCount = dataView.getLength(),
        rows = [];

    for(var idx=0; idx < rowCount; idx+=1){
      rows.push(dataView.getItem(idx));
    }

    return rows;
  };

  //Rank is based on 'more is better' flag
  function calculateRanks(data){
    var processedData = data.slice();

    _.each(columns, function(col){
      if(col.format !== formats.SYMBOL_STRING){
        var field = col.field,
            moreIsBetter = col.moreIsBetter;

        //sort data by column
        processedData = _.sortBy(processedData, function(d){
                          return moreIsBetter ? -d[field] : d[field];
                      });
        //TODO: exclude null values from processed data?

        //calculate ranks
        var rank = 0,
            currentVal,
            prevVal,
            rankField = col['field'] + '_rank';

        for(var i=0; i<processedData.length; i+=1){
          currentVal = processedData[i][field];
          if(currentVal !== prevVal)
            rank += 1;

          processedData[i][rankField] = rank;
          prevVal = currentVal;
        }

      }
    });

    //default sort by first numeric column
    var pCol = _.find(columns, function(col){
      return col.order !== -1;
    });
    var key = pCol && pCol.field ? pCol.field : "";

    processedData = _.sortBy(processedData, function(row){
      return -row[key];
    });

    return processedData;
  }

  function compare(a, b){
    return a[sortcol] > b[sortcol] ? 1 : a[sortcol] < b[sortcol] ? -1 : 0;
  }

  function getFormattedValue(v, format){
     if (isNaN(v))
      return formats.SYMBOL_NAN;

    var fm;

    switch(format){
      case formats.SYMBOL_INT:
        fm = d3.format(",.0f")(v);
        break;
      case formats.SYMBOL_FLOAT:
        fm = d3.format("0,.2f")(v);
        break;
      case formats.SYMBOL_PERCENT:
        fm = d3.format("%")(v);
        break;
      case formats.SYMBOL_CURRENCY:
        fm = '$' + d3.format("0,.0f")(v);
        break;
      default:
        fm = v;
        break;
    }

    return fm;
  }

  function getFormattedRank(rank){
    var fmRank = "",
        suffix = "th",
        r = rank % 100;

    if(r === 11 || r === 12 || r === 13)
      return rank + suffix;

    switch(rank % 10){
      case 1:
        suffix = "st";
        break;
      case 2:
        suffix = "nd";
        break;
      case 3:
        suffix = "rd";
        break;
    }

    return rank + suffix;
  }

  function resetSortIndicator(){
    //remove previous sort-icon if any
    $('.slick-sort-indicator').removeClass('slick-sort-indicator-desc');
    $('.slick-sort-indicator').removeClass('slick-sort-indicator-asc');

    //update the 'sort indicator' for the default sort column (first numeric col)
    var sortIndicators = $('.slick-header-column .slick-sort-indicator').not(':first'); //exclude the sort icon for the primary column
    if(sortIndicators.length > 0){
      var sortIcon = sortIndicators[0];
      $(sortIcon).addClass('slick-sort-indicator-desc');
    }
  }

  function customCellFormatter(row, cell, value, columnDef, dataContext) {
    var field = columnDef.field,
        rankField = field + '_rank',
        fmValue = getFormattedValue(value, columnDef.format),
        fmRank = getFormattedRank(dataContext[rankField]);

    var cellContent = '<div class="cell-wrapper"><div class="rank">' + fmRank + '</div>' + '<div class="score">' + fmValue + '</div></div>';
    return cellContent;
  }

  return grid;
};
