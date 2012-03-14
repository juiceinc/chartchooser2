(function( $ ){

  var methods = {


    init : function( options ) {
      return $(this);
    },

    findColumns: function(data, options) {

      if(!data || data.length < 1)
        return [];

      //settings
      var settings = $.extend({
          'microformat' : {
            SYMBOL_PRIMARY_KEY    : "*",
            SYMBOL_REVERSE_ORDER  : "-",
            SYMBOL_FLOAT          : "d",
            SYMBOL_INT            : "i",
            SYMBOL_CURRENCY       : "$",
            SYMBOL_PERCENT        : "%",
            SYMBOL_STRING         : "s",
            SYMBOL_NAN            : "--"
          },
          numberOfColumnsToProcess: 20
        }, options);



      var columns = []; //array of {name: "abc[1-]", label:"abc",  }

      var rawColumns = _.keys(data[0]);
      var specialColumns = _.filter(rawColumns, function(col){
        return col && col.indexOf('[') > -1 && col.indexOf(']') > -1;
      });

      //process special columns
      _.each(specialColumns, function(col){
        //parse header microformat, eg. myColumn[-3$]
        var headerFormat = col.substring(col.lastIndexOf('['), col.lastIndexOf(']'));

        var columnFormat = methods.getBlankColumnMetadata(col, settings.microformat.SYMBOL_INT);
        columnFormat.label = col.substring(0, col.lastIndexOf('['));

        //primary key
        if(headerFormat.indexOf(settings.microformat.SYMBOL_PRIMARY_KEY) > -1){
          columnFormat.order = -1;
          columnFormat.format = settings.microformat.SYMBOL_STRING;
          columnFormat.moreIsBetter = false;
        }
        else
        {
          //order
          var numbers = headerFormat.match(/\d+/g); //get allsettings.microformat.SYMBOL_INTnumbers, returned as array
          if(numbers && !isNaN(numbers[0] * 1) ) //the first item is the order #
            columnFormat.order = numbers[0] * 1;

          //more is better ?
          columnFormat.moreIsBetter = headerFormat.indexOf('-') == -1;

          //money
          if(headerFormat.indexOf(settings.microformat.SYMBOL_CURRENCY) > -1)
            columnFormat.format = settings.microformat.SYMBOL_CURRENCY;
          //float
          else if(headerFormat.indexOf(settings.microformat.SYMBOL_FLOAT) > -1)
            columnFormat.format = settings.microformat.SYMBOL_FLOAT;
          //percentage
          else if(headerFormat.indexOf(settings.microformat.SYMBOL_PERCENT) > -1)
            columnFormat.format=settings.microformat.SYMBOL_PERCENT;
          //default is integer
          else
            columnFormat.format = settings.microformat.SYMBOL_INT;
        }
        columns.push(columnFormat);
      });

      //add non-special columns
      var unprocessedColumns = _.difference(rawColumns, specialColumns);

      //find primary key column first if not already set
      var hasPrimaryKey = _.any(columns, function(column){return column.order === -1; /*only PK has order of -1*/});

      //add primary key if doesn't exist
      if(!hasPrimaryKey){
        var primaryKeyColumnName = methods.findSpecificColumn(unprocessedColumns, data, methods.nonNumericChecker);
        if(primaryKeyColumnName){
          var columnMetaData = methods.getBlankColumnMetadata(primaryKeyColumnName, settings.microformat.SYMBOL_STRING);
          columnMetaData.moreIsBetter = false;
          columnMetaData.order = -1;

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
      while(unprocessedColumns.length > 0 && columns.length <= settings.numberOfColumnsToProcess )
      {
        var numericColumnName = methods.findSpecificColumn(unprocessedColumns, data, methods.numericChecker);
        if(numericColumnName)
        {
          var metadata = methods.getBlankColumnMetadata(numericColumnName, settings.microformat.SYMBOL_INT);
          metadata.order += i++;
          columns.push(metadata);
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
    },

    //returns a blank column meta data
    getBlankColumnMetadata: function(name, format) {
      return {
        name          : name,
        label         : name,
        moreIsBetter  : true,
        order         : 10000,
        format        : format
      };
    },

    //numeric value checker
    numericChecker : function(value) {
      return value ? !isNaN(value * 1) : true;
    },

    //non numeric value checker
    nonNumericChecker : function (value) {
      return value ? isNaN(value * 1) : true;
    },

    //finds the first column whose values (only a certain amount of) satisfy checkFunction
    findSpecificColumn : function(columnNames, data, checkFunction){
      var SAMPLE_SIZE = 10;

      //check only first SAMPLE_SIZE items
      var sample = _.first(data, SAMPLE_SIZE);

      //find the first column that matches criteria
      return _.find(columnNames, function(columnName){
        var values = _.pluck(sample, columnName); //column values
        return _.any(values) /*at least one value should be valid*/ && _.all(values, checkFunction); //check if all values meet criteria
      });
    },

    subset : function (data, filterFx, key) {
      return _.filter(data, filterFx);
    },

    //groups by rows by key
    groupby : function (rows, key, columns) {
      var uniqueKeys = methods.unique(rows, key);
      var groupedRows = rows;
      var lookup = {};

      if(uniqueKeys.length !== rows.length) {
        var keyValue = '';
        var groupedRow;
        _.each(rows, function(row) {
          keyValue = row[key];
          if(!lookup[keyValue]) {
            lookup[keyValue] = {};
            lookup[keyValue][key] = keyValue;
          }

          groupedRow = lookup[keyValue];

          //group by each column in this row
          _.each(columns, function(column){

            if(!groupedRow[column.name]) {
              groupedRow[column.name] = 0;
              groupedRow[column.name + '_cnt'] = 0;
            }

            //summarize the value
            if (!isNaN(row[column.name])) {
              groupedRow[column.name] += row[column.name] * 1;
              groupedRow[column.name + '_cnt']++;
            }
          });
        });

        groupedRows = [];
        _.each(lookup, function(obj) {

          //update averages
          _.each(columns, function(column){
            if(obj[column.name+'_cnt'] > 0 )
              obj[column.name] = obj[column.name] / obj[column.name+'_cnt'];});
          groupedRows.push(obj); });
      }

      return groupedRows;
    },

    unique : function (rows, key) {
      return _.uniq(_.map(rows, function (row){ return row[key]; }));
    },

    sum : function (rows, key) {
      return _.reduce(rows, function(memo, row) { return memo + row[key]*1; }, 0);
    },

    average : function (rows, key) {
      return (rows.length > 0) ? methods.sum (rows, key) / rows.length : 0;
    }

  };



  $.fn.datautils = function( method ) {

    if ( methods[method] ) {
      return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on datautils' );
    }

  };

}) ( jQuery );
