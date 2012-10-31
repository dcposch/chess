package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request){
        fmt.Fprintf(w, "Hello world")
    })
    http.Handle("/", http.FileServer(http.Dir("static/")))

    socket := "0.0.0.0:8080"
    fmt.Println("Serving on "+socket)
    err := http.ListenAndServe(socket, nil)
    fmt.Println(err)
}
