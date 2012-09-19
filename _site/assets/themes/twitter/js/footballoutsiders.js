//when dom is ready
$(function() {


  var BASE_URL = 'http://localhost:4000/standalone_leaderboard.html#';
  var links = {
    'Week 1': { offense: '88f9467ed53e60f5af690ee949cfef27', defense: 'd8d78ff9de0bc76916be4fe978e8a49c', st: 'ef5d4c86cc260c4e44edf9caf54d773f'},
    'Week 2': { offense: '56a088893f23a599c827c89b810f154d', defense: '59627dfff2ad8dd327e6f46129d0a2f6', st: '84f64bfc9142d6d7ed3ff87d17c4bf2c'},
    'Week 3': { offense: '56a088893f23a599c827c89b810f154d', defense: '59627dfff2ad8dd327e6f46129d0a2f6', st: '84f64bfc9142d6d7ed3ff87d17c4bf2c'},
    'All weeks': { offense: '88f9467ed53e60f5af690ee949cfef27', defense: 'd8d78ff9de0bc76916be4fe978e8a49c', st: 'ef5d4c86cc260c4e44edf9caf54d773f'}
  };


  init();


  function init() {

    //populate weeks
    var $weeks = $('#weeks');
    _.each(links, function(value, key) {
      $weeks.append('<option>'+key+'</option>');
    });


    //add handlers
    addHandlers();

    //fire a change to start it with default option
    $('#weeks').change();
  }

  function addHandlers() {

    $('#weeks').change(function(e){

      var selectedWeek = $('#weeks').val();

      if(links[selectedWeek]){


        var linkObj = links [selectedWeek];
        $('#offense iframe').attr('src', BASE_URL + linkObj.offense);
        $('#defense iframe').attr('src', BASE_URL + linkObj.defense);
        $('#special-teams iframe').attr('src', BASE_URL + linkObj.st);

      }
    });
  }

});
