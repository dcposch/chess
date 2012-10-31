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

    http.ListenAndServe("0.0.0.0:8000", nil)
}
