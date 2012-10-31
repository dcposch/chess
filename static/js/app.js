// DC
// Fall 2012 

var model = {
    board:[[]], //piece ids like "wK" or "wp1"
    pieces:{},  //piece id -> [row,col] 0-based
    moves:[],   //strings like "e4e5"
    turn:0,     //0-based turn, white goes on 0, black on 1, etc
    outcome:"playing", //otherwise "black", "white", or "tie"
    clock: {black:0, white:0},
    lastMove: {date:null, clock:0}
};

var view = {
    board:null,         //jquery obj for the board
    size:72,            //size of a board square in pixels
    pieces:{},          //map from piece id to <img>
    promtLabel:null,    //says "white to play", etc
};


/* MODEL */
model.reset = function(){
    // starting configuration
    model.board = [
        [], // allow 1-based indexing
        [null, "wr1","wn1","wb1","wq" ,"wk" ,"wb2","wn2","wr2"],
        [null, "wp1","wp2","wp3","wp4","wp5","wp6","wp7","wp8"],
        [null, "","","","","","","",""],
        [null, "","","","","","","",""],
        [null, "","","","","","","",""],
        [null, "","","","","","","",""],
        [null, "bp1","bp2","bp3","bp4","bp5","bp6","bp7","bp8"],
        [null, "br1","bn1","bb1","bq" ,"bk" ,"bb2","bn2","br2"]
    ];
    model.pieces = {};
    for(var i = 1; i <= 8; i++){
        for(var j = 1; j <= 8; j++){
            if(!model.board[i][j]) continue;
            model.pieces[model.board[i][j]] = [i,j];
        }
    }
    model.moves = [];

    // each player gets five minutes
    model.clock.black = 5*60;
    model.clock.white = 5*60;
}

model.whoseTurn = function(){
    if(model.turn%2 == 0) return "white";
    else return "black";
}
model.whatTurn = function(){
    return Math.floor(model.turn/2)+1;
}

model.canMove = function(r1,c1,r2,c2){
    if(r1 < 1 || r1 > 8 
        || c1 < 1 || c1 > 8
        || r2 < 1 || r2 > 8
        || c2 < 1 || c2 > 8){
        return "wat";
    }
    if(r1==r2 && c1==c2) return "no move";
    var pieceIdMoved = model.board[r1][c1];
    var pieceIdTaken = model.board[r2][c2];
    if(!pieceIdMoved) return "no piece selected";
    var player = pieceIdMoved[0]=="w" ? "white" : "black";
    if(player != model.whoseTurn()) return "that's not your piece";
    if(pieceIdTaken){
        var playerTaken = pieceIdTaken[0];
        if(playerTaken == model.whoseTurn()) {
            return "can't take your own piece";
        }
    }
    var pieceType = pieceIdMoved[1];
    if(pieceType=="p"){
        var isLegal = false;
        var nextRow = player=="white" ? (r1+1) : (r1-1);
        if(!pieceIdTaken && (r2==nextRow) && (c1==c2)) isLegal = true;
        if(pieceIdTaken && (r2==nextRow) && Math.abs(c1-c2)==1) isLegal = true;
        var baseRow = player=="white" ? 2 : 7;
        var basePlus2Row = player=="white" ? 4 : 5;
        if(!pieceIdTaken && (r1==baseRow) && (r2==basePlus2Row) 
            && (c1==c2)) isLegal = true;
        //TODO: en passant
        if(!isLegal) return "pawns can't move like that";
    } else if(pieceType=="b" || pieceType=="r" || pieceType=="q"){
        var isDiagonal = Math.abs(r2-r1) == Math.abs(c2-c1);
        var isStraight = (r1==r2) || (c1==c2);
        if(pieceType=="b" && !isDiagonal) {
            return "bishops must move diagonally"; 
        }else if(pieceType=="r" && !isStraight){
            return "rooks must move horizontally or vertically";
        }else if(!isStraight && !isDiagonal){
            return "queens must move horizontally, vertically or diagonally";
        }
        var dr = 0;
        if(r2>r1) dr = 1;
        if(r2<r1) dr = -1;
        var dc = 0;
        if(c2>c1) dc = 1;
        if(c2<c1) dc = -1;
        for(var i = 1; i<8; i++){
            var rmid=r1+i*dr, cmid=c1+i*dc;
            if(rmid==r2 && cmid==c2) break;
            if(model.board[rmid][cmid]) {
                return "can't move through another piece";
            }
        }
    } else if(pieceType=="n"){
        var d1 = Math.abs(r2-r1);
        var d2 = Math.abs(c2-c1);
        if(!((d1==1 && d2==2) || (d1==2 && d2==1))){
            return "knights move one step straight, then one step diagonally";
        }
    } else if(pieceType=="k"){
        if(Math.abs(r2-r1)>1 || Math.abs(c2-c1)>1){
            return "the king moves one square in any direction";
        }
        //TODO: castle
    }

    // make sure we're not moving into check
    model.board[r1][c1] = "";
    model.board[r2][c2] = pieceIdMoved;
    model.turn++;
    var inCheck = false;
    var pid = model.whoseTurn()=="white" ? "w" : "b";
    var kid = pid+"k"; // the king
    var kloc = model.pieces[kid];
    for(var pid in model.pieces){
        var ploc = model.pieces[pid];
        if(model.canMove(ploc[0],ploc[1],kloc[0],kloc[1]) == "ok"){
            inCheck = true;
        }
    }
    model.turn--;
    model.board[r2][c2] = pieceIdTaken;
    model.board[r1][c1] = pieceIdMoved;
    if(inCheck) return "cannot move into check";
    return "ok";
}

model.move = function(r1,c1,r2,c2){
    var pieceIdMoved = model.board[r1][c1];
    var pieceIdTaken = model.board[r2][c2];
    assert(pieceIdMoved);
    var valid = model.canMove(r1,c1,r2,c2);
    if(valid != "ok") throw valid;

    model.board[r1][c1] = "";
    model.board[r2][c2] = pieceIdMoved;
    model.pieces[pieceIdMoved] = [r2, c2];
    if(pieceIdTaken){
        delete model.pieces[pieceIdTaken];
    }
    model.turn++;

    // punch the clock
    var now = new Date();
    var diff = 0;
    if(model.lastMove.date){
        (now.getTime() - model.lastMove.date.getTime()) / 1000.0;
    }
    model.lastMove.date = now;
    model.lastMove.clock = model.clock[model.whoseTurn()] - diff;
}

model.updateClock = function(){
    if(!model.lastMove.date){
        return;
    }
    var diff = (new Date().getTime()- model.lastMove.date.getTime())/1000.0;
    var c = model.lastMove.clock - diff;
    model.clock[model.whoseTurn()] = c;
}

/* VIEW */
view.reset = function(){
    // attach the label
    view.label = $("#label");

    // create the board
    view.board = $("#board");
    view.board.html("");
    for(var i = 1; i <= 8; i++){
        var rowElem = $("<div />");
        for(var j = 1; j <= 8; j++){
            var squareElem = $("<span class='square' />");
            squareElem.data('loc', [i,j]);
            if((i+j)%2 == 0){
                squareElem.addClass("light");
            } else {
                squareElem.addClass("dark");
            }
            rowElem.append(squareElem);
        }
        view.board.append(rowElem);
    }

    // create pieces
    view.pieces = {};
    for(var i = 1; i <= 8; i++){
        for(var j = 1; j <= 8; j++){
            if(!model.board[i][j]) continue;
            var pieceId = model.board[i][j];
        }
    }
}
// updates the board to reflect
// a move that's been made
view.update = function() {
    view.updateBoard();
    view.updateText();
};

view.updateText = function() {
    // the label is a sort of "hud" for the game
    var h = "Turn " + model.whatTurn() + " &middot; "; 
    if(model.whoseTurn()=="white"){
        h = "White to play";
    } else {
        h = "Black to play";
    }
    h += "<br />";
    view.label.html(h);
}

view.updateBoard = function() {
    
    // insert/update pieces
    for(var pieceId in model.pieces){
        var pieceLoc = model.pieces[pieceId];
        var newX = (8-pieceLoc[0])*view.size;
        var newY = (pieceLoc[1]-1)*view.size;
        var imgElem = $("#"+pieceId);
        if(imgElem.size() == 0){
            // new piece. create it
            var pieceType = pieceId.substring(0,2);
            imgElem = $("<img />");
            imgElem.addClass("piece");
            imgElem.attr("id", pieceId);
            imgElem.attr("src", "img/48/"+pieceType+".png");
            imgElem.css("top", newX);
            imgElem.css("left", newY);
            view.pieces[pieceId] = imgElem;
            view.board.append(imgElem);
        } else if(imgElem.css("left")!=newX || imgElem.css("top")!=newY) {
            // existing piece. move it.
            imgElem.animate({
                    "top":newX,
                    "left":newY
                }, "fast");
        }
    }
    // delete pieces
    $(".piece").filter(function(){
        return !model.pieces[this.id];
    }).fadeOut("fast", function(){$(this).remove();});
}

view.wireEvents = function(imgElem){
    $(document).on("mousedown", "#board .piece", function(evt){
    });
    view.board.mousemove(function(evt){
    });
    imgElem.mouseup(function(evt){
    });
}

view.updateClock = function(){
    function updateClockLabel(elem, totalSecs){
        var mins = Math.floor(totalSecs / 60);
        var secs = Math.floor(totalSecs % 60);
        elem.toggleClass("lowOnTime", mins==0);
        elem.text(mins+":"+(secs < 10 ? "0":"")+secs);
    }
    updateClockLabel($("#clockW"), model.clock.white);
    updateClockLabel($("#clockB"), model.clock.black);
}

/* HELPER METHODS */
function assert(val){
    if(!val){
        throw "assertion failed";
    }
}

/* SUPERVISOR (MVS) */
function wireEvents(){
    var dragPiece = null, dragOffset = [], dragLoc = [];
    var updateLoc = function(evt){
        var boardLoc = view.board.offset();
        var newDragLoc = [
            8 - Math.floor((evt.pageY - boardLoc.top) / view.size),
            1 + Math.floor((evt.pageX - boardLoc.left) / view.size)
        ]; // [row, col] on the chessboard
        if(newDragLoc[0]!=dragLoc[0] || newDragLoc[1]!=dragLoc[1]){
            dragLoc = newDragLoc;
        }
    };
    $(document).on("mousedown", "#board .piece", function(evt){
        console.log("piece "+$(this).attr("id")+" clicked");
        dragPiece = this;
        var off = $(this).position();
        dragOffset = [
            off.left - evt.pageX,
            off.top - evt.pageY
        ];
        evt.preventDefault(); 

        // show what's legal
        var loc = model.pieces[dragPiece.id];
        for(var i = 1; i <= 8; i++){
            for(var j = 1; j <= 8; j++){
                if(model.canMove(loc[0], loc[1], i, j) == "ok"){
                    var sq = $(view.board[0].children[8-i].children[j-1]);
                    sq.addClass("canMove");
                }
            }
        }
    });
    $(document).mouseup(function(evt){
        if(!dragPiece) return;
        console.log("piece "+$(dragPiece).attr("id")+" released");
        $("#board .canMove").removeClass("canMove");
        updateLoc(evt);
        var loc = model.pieces[dragPiece.id];
        var canMove = model.canMove(loc[0],loc[1],dragLoc[0],dragLoc[1]);
        if(canMove == "ok"){
            model.move(loc[0],loc[1],dragLoc[0],dragLoc[1]);
        } else {
            console.log(canMove);
        }
        view.update();

        dragPiece = null; 
    });
    $(document).mousemove(function(evt){
        if(!dragPiece) return;
        $(dragPiece).css("left", evt.pageX + dragOffset[0]);
        $(dragPiece).css("top", evt.pageY + dragOffset[1]);

        updateLoc(evt);
    });
}

$(function(){
    model.reset();
    view.reset();
    view.update();
    wireEvents();
    setInterval(function(){
        model.updateClock();
        view.updateClock();
    },20);

});

