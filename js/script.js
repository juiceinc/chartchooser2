/* Author: Djam
*/

const DATA_SIZE = 15; //num of random data items to generate
const DISPLAYED_ROWS = 5;
const HOVER_DURATION = 1000;
const CELL_WIDTH = 200;
var MODE_ASC = false;


var data = [],
    columns,
    cells;



//----------------------------------------------- handlers, util functions

function addHandlers (){
    $('#searchInput').keypress(function(e){ if((e.keyCode || e.which) == 13 /* Enter */) return searchItems();});
    $('#searchBtn').click(function (e) { return searchItems(); });
    $('#asc').click(function (e) {MODE_ASC = true; reloadCells(); });
    $('#desc').click(function (e) {MODE_ASC = false; reloadCells();});
}



function searchItems(){
    var searchStr = $('#searchInput').val();
    cells.classed('selected', false);

    cells.filter(function(cellData){return cellData.name.toLowerCase() === searchStr.toLowerCase();})
        .classed('selected', true);
    
    return false;
}

//money format function
var money = d3.format("0,.2f");

//rank format function (returns 1st, 23rd, etc..)
function rank(num)
{
    if (num === 0) return "0";
    switch (num % 100)
    {
        case 11:
        case 12:
        case 13:
        return num + "th";
    }
    switch (num % 10)
    {
        case 1: return num + "st";
        case 2: return num + "nd";
        case 3: return num + "rd";
    }
    return num + "th";
}

//----------------------------------------------- Data

//create data
var columnObj = [
                {name: "Total Budget", ascending: false},
                {name: "Paid to Date", ascending: false},
                {name: "Prior period", ascending: false}
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

//-----------------------------------------------Leaderboard implementation

//removes styles attribute
function removeStyles (el, properties) {
    if (properties)
        properties.foreach(function (prop) {el.style(prop, null);});
    else
        el.attr('style', null);
}

//animates selection to hovered state (used for "out of range" cells)
function animateToHovered(selection){
    
    if(selection.empty()) return;
    
    var _height = selection.style('height');

    selection.style('height', '0px');
    selection.style('opacity', 0.5);

    selection
        .transition()
            .duration(100)
            .style('height', _height)
        .transition()
            .delay(100)
            .duration(300)
            .style('opacity', 1)
        //remove animated properties
        .each('end', function (d, i) { removeStyles ( d3.select(this)); })
    ;
}

//animates selection to selected state (used for "out of range" cells)
function animateToSelected(selection){
    
    if(selection.empty()) return;
    
    var _bgcolor = selection.style('background-color');
    var _color = selection.style('color');

    //it starts with hovered colors
    //FIXME: find a way to get hovered colors
    selection.style('background-color', '#DFDFDF');
    selection.style('color', '#404040');

    //animate to selected colors
    selection
        .transition()
            .duration(500)
            .style('background-color', _bgcolor)
            .style('color', _color)
        //remove animated properties
        .each('end', function (d, i) { removeStyles ( d3.select(this)); })
    ;
}


function initLeaderboard(){

    // FIXME : don't set explicit height
    d3.select("#leaderboard").style('height', DISPLAYED_ROWS * 60 + 30 + 'px');

    //Columns
    columns = d3.select("#leaderboard")
        .selectAll(".leaderboard-column")
           .data(columnObj)
           .text(function(d){ return d.name;})
           ;
    //Enter
    columns.enter()
        .append("div")
        .style("width", function (d, i) { return CELL_WIDTH +"px"; })
        .style("left", function (d, i) { return i * CELL_WIDTH +"px"; })
        .classed("leaderboard-column", true)
        .text(function(d){ return d.name; })
        ;
    //Exit
    columns.exit()
        .remove();

    //Cells
    reloadCells();
    //Enter
    cells.enter()
        .append('div')
        .classed("leaderboard-cell", true)
        .classed('cell-out-of-range', function(d, i){
            return i >= DISPLAYED_ROWS;
        })
        ;
    //Exit
    cells.exit()
        .remove();

    //cell title
    cells.append('div')
        .classed("title", true)
        .text(function(d,i,j) {
            return d['name'];
        });

    //cell rank+value container
    var vals = cells.append('div')
            .classed("val-container", true);
        //rank
        vals.append('div')
            .classed("rank", true)
            .text(function(d,i,j) {
                return rank(i+1);
        });
        //value
        vals.append('div')
            .classed("value", true)
            .text(function(d,i,j) {
                return "$" + money(d[columnObj[j].name]);
        });


    //------------------------Cell Event handlers
    //Cell click
    cells.on("click", function(d, i){

        //deselect all
        cells.classed('selected', false);

        //select relevant ones
        var selected = cells.filter(function(cellData){ return d === cellData;})
            .classed('selected', true)
            ;

        //animate color for those out of range
        columns.selectAll('.leaderboard-cell.cell-out-of-range.selected').call(animateToSelected);
    });
    
    //cell mouse over
    cells.on("mouseover", function(d, i){
             var hovered = cells.filter(function(cellData){ return d === cellData;})
                    .classed('hovered', true)
                    ;

                //fade in those out of range
                columns.selectAll('.leaderboard-cell.cell-out-of-range.hovered').call(animateToHovered);
    });
    
    //cell mouse out
    cells.on("mouseout", function(d, i){
            var hovered = cells.filter(function(cellData){ return d === cellData;})
                .classed('hovered', false)
                ;
        });
        
}

function reloadCells(){
    //Cells
    cells =
        columns.selectAll(".leaderboard-cell")
            .data(
                function(columnObj){
                        //data sorted by the current columnObj
                        return data.sort(function(a, b){
                            return MODE_ASC ?
                                d3.ascending(a[columnObj.name], b[columnObj.name])
                                : d3.descending(a[columnObj.name], b[columnObj.name])
                                });
                        }
                , function (d){ return d.name; })
            .classed('cell-out-of-range', function(d, i){
                return i >= DISPLAYED_ROWS;
            })
            ;
            
    cells.order();
}

//-----------------------------------------------Start
function start(){
    addHandlers();
    createSampleData();
    initLeaderboard();
}
start();
