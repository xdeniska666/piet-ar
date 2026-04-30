package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

type Product struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Price       int    `json:"price"`
	Composition string `json:"composition"`
	RecipeURL   string `json:"recipe_url"`
}

var products = map[int]Product{
	1: {ID: 1, Name: "Оливки Green Queen", Price: 299, Composition: "оливки, соль, масло", RecipeURL: "https://example.com/recipes/olives"},
	2: {ID: 2, Name: "Сыр Фета", Price: 450, Composition: "молоко, соль, сычужный фермент", RecipeURL: "https://example.com/recipes/feta"},
	3: {ID: 3, Name: "Томаты черри", Price: 199, Composition: "томаты", RecipeURL: "https://example.com/recipes/cherry"},
	4: {ID: 4, Name: "Масло оливковое", Price: 599, Composition: "оливки первого отжима", RecipeURL: "https://example.com/recipes/oil"},
	5: {ID: 5, Name: "Базилик свежий", Price: 89, Composition: "базилик", RecipeURL: "https://example.com/recipes/basil"},
}

func main() {
	// Эндпоинт для получения данных по ID
	http.HandleFunc("/api/product/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		// Получаем ID из URL (например, /api/product/1)
		var id int
		fmt.Sscanf(r.URL.Path, "/api/product/%d", &id)

		product, exists := products[id]
		if !exists {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Product not found"})
			return
		}

		json.NewEncoder(w).Encode(product)
	})

	// Обработчик статических файлов (HTML, CSS, JS)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "index.html")
			return
		}
		http.ServeFile(w, r, r.URL.Path[1:])
	})

	// Порт для Render берётся из переменной окружения PORT
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
