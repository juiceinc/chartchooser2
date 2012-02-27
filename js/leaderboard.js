//leaderboard.js
//when dom is ready
$(function() {



  const DATA_SIZE = 15; //num of random data items to generate
  const DISPLAYED_ROWS = 5;
  const HOVER_DURATION = 1000;
  const CELL_WIDTH = 200;



  // new Tangle(document.getElementById("leaderboard-direction"), {
  //   initialize: function () {
  //     this.leadersOrLaggards = true;
  //   },
  //   update: function () {}
  // });


  var data = [],
      leaderboard;
  //----------------------------------------------- handlers, util functions

  function addHandlers (){
    $('#searchInput').keypress(function(e){ if((e.keyCode || e.which) == 13 /* Enter */) { searchItems(); } });
    $('#searchBtn').click(function (e) { searchItems(); return false; });
    $('#asc').click(function (e) {updateSort(true); return false; });
    $('#desc').click(function (e) {updateSort(false); return false; });
    $('#input-form').submit(function() { dataUpdated(); return false; });
  }


  function dataUpdated(){
    csv = $('#csv-data').val();
    data = d3.csv.parse(csv);
    var key = findKeyColumn(data);
    columnObj = findColumns(data, key);
    leaderboard.refresh({data: data, columnObj: columnObj, key: key});
  }

  function searchItems(){
    var searchStr = $('#searchInput').val();
    leaderboard.selectByKey(searchStr);
  }

  function updateSort(modeASC){
    leaderboard.refresh({"modeASC": modeASC});
  }

  //get the first non-numeric column
  function findKeyColumn(data){

    for (var key in data[0]) {
      if(isNaN(data[0][key]))
        return key;
    }
    return null;
  }

  function findColumns(data, excludedColumn){
    if(data.length == 0)
      return;

    var columnObj = [];
    var dataKey;
    for (var prop in data[0]) {
      if(prop !== excludedColumn)
        columnObj.push({"name": prop, "ascending": false, "numeric": !isNaN(data[0][prop])});
    }
    return columnObj;
  }


  //----------------------------------------------- Data

  //create data
  var columnObj = [
                  {name: "Total Budget", ascending: false, numeric: true},
                  {name: "Paid to Date", ascending: false, numeric: true},
                  {name: "Prior period", ascending: false, numeric: true}
                  ];


  function createSampleData(){
      for ( var num in d3.range(DATA_SIZE)){
          var datum = {name: "Name "+ num};
          for( var i in columnObj){
              datum[columnObj[i].name] = Math.random() * 100000;
          }
          data.push(datum);
      }
  }

  //-----------------------------------------------Start
  function start(){
      addHandlers();
      createSampleData();

      leaderboard = juice.leaderboard({
        numberOfDisplayedRows: 5,
        cellWidth: CELL_WIDTH,
        key: "name",
        container : "#leaderboard",
        columnObj: columnObj,
        data: data
      });

  }
  start();

});
