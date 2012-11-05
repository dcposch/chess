// Serves a simple speed-chess server.
// Routes:
// / -- html,js,css,images
// /api -- ajax api
// GET  /api/new
//   * returns the gameid for a new game
// POST /api/(game id)/move
//   * post a move in algebraic notation (eg "e2e4")
//   * returns JSON representing the new game state
// GET  /api/(game id)
//   * returns JSON representing the game state
// POST /api/(game id)/listen
//   * post a url
//   * every time that game changes, 
//     the game state will be POSTed to that url
package main

import (
    "fmt"
    "strings"
    "io/ioutil"
    "encoding/json"
    "net/http"
    "time"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
)

const (
    httpUrl       = "localhost:3001"
    mongoUrl      = "localhost:27017"
    mongoUsername = ""
    mongoPassword = ""
)

// Represents a single move in a chess game.
// Contains (row, col) for the start and end position
// of the piece being moved. Rows and col are in [1,8]
// When you castle, the king is the piece that moves.
type Move struct {
    Move string `json:"move"` // eg "e2e4"
    Timestamp int64 `json:"timestamp"` // millis after 1970 UTC
}

type Game struct {
    Id bson.ObjectId "_id"
    Moves []Move `json:"moves"`
}
func (g *Game) ToJSON() string {
    js,err := json.Marshal(g)
    if err!=nil {
        panic("json serialization failed");
    }
    return string(js)
}


// some helpers
func now() int64 {
    return time.Now().UnixNano()/1000000;
}
func fail(w http.ResponseWriter, code int, msg string){
    w.WriteHeader(code)
    fmt.Fprintf(w, "<h1>%d</h1>\n%s", code, msg)
}
func findGame(hexId string, collGames *mgo.Collection) (*Game,error) {
    g := new(Game)
    id := bson.ObjectIdHex(hexId)
    err := collGames.FindId(id).One(g)
    if err!=nil {
        return nil,err
    }
    return g,nil
}

func main() {
    // MONGO
    session,err := mgo.Dial(mongoUrl)
    if err!=nil {
        fmt.Println("couldn't connect to mongo at "+mongoUrl)
        return
    }
    defer session.Close()
    collGames := session.DB("chess").C("games")

    // HTTP
    http.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request){
        fmt.Println("handling ",r.Method,r.URL)
        defer func() {
            if r:=recover();r!=nil {
                fail(w, 500, fmt.Sprintf("%v", r))
            }
        }()
        parts := strings.Split(r.URL.Path, "/")[2:]
        lastPart := parts[len(parts)-1]
        k := len(parts)
        if k==1 && r.Method=="GET" && lastPart=="new" {
            g := Game{}
            g.Id = bson.NewObjectId()
            collGames.Insert(g)
            fmt.Println("created a new game: "+g.Id.Hex())
            fmt.Fprintf(w,"\"%s\"\n", g.Id.Hex());
        } else if k==1 && r.Method=="GET" {
            g,err := findGame(parts[0], collGames)
            if err!=nil {
                fail(w, 404, fmt.Sprintf("game not found: %v", err))
                return
            }
            fmt.Fprintf(w, g.ToJSON())
        } else if k==2 && r.Method=="POST" && lastPart=="move" {
            fmt.Println("trying to make a move...")

            // construct a new chess move
            data,err := ioutil.ReadAll(r.Body)
            if err!=nil || len(data)!=4 {
                fail(w,500,fmt.Sprintf("invalid data %d, err %v", len(data), err))
                return
            }
            m := Move{}
            m.Move = string(data)
            m.Timestamp = now()

            // find and update the game
            g,err := findGame(parts[0], collGames)
            if err!=nil {
                fail(w, 404, fmt.Sprintf("game not found: %v", err))
                return
            }
            g.Moves = append(g.Moves,m)
            collGames.UpdateId(g.Id, g)

            // send back the new, full state of the game
            fmt.Fprintf(w, g.ToJSON())
        } else {
            fail(w, 404, "wat")
            return
        }
    })
    http.Handle("/", http.FileServer(http.Dir("static/")))

    socket := "127.0.0.1:3001"
    fmt.Println("Serving on "+socket)
    err = http.ListenAndServe(socket, nil)
    fmt.Println(err)
}
