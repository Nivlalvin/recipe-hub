#Recipe Hub

A simple recipe search web app built with **HTML, CSS, and JavaScript**, powered by the [Spoonacular API](https://spoonacular.com/food-api).  
Users can search for recipes, apply filters (diet, cuisine, intolerances, type), and view recipe details in a modal.

---

## Live Demo
[Recipe Hub on Vercel](https://recipe-hub-git-main-nivlalvins-projects.vercel.app)

---

## Features
- **Search Recipes** by keyword  
- **Filter Recipes** by cuisine, diet, type, or intolerances  
- **View Full Recipe Details** (ingredients, instructions, time, servings)  
- **Responsive UI** built with vanilla HTML + CSS  
- **Deployed on Vercel** with serverless functions as API proxies  

---

## Project Structure
recipe-hub/
│
├── index.html # Homepage with featured recipes
├── recipes.html # Search and browse recipes
├── contact.html # Contact form
│
├── css/ # Styles
│ └── styles.css
│
├── js/ # Scripts
│ ├── script.js # Main frontend logic
│ └── config.js # Local dev config 
│
├── api/ 
│ ├── search.js
│ └── recipe.js 
│
└── README.md

---

## ⚙️ Setup & Development
git clone https://github.com/Nivlalvin/recipe-hub.git
cd recipe-hub

2. Install Dependencies
No package manager needed — it’s plain HTML/CSS/JS.

3. Local Development
Open index.html with Live Server in VSCode (or any static server).
Create a js/config.js file for local use (don’t commit this to GitHub):

const SPOONACULAR_KEY = "your-api-key-here";

Update your local script.js to use that key when running locally.

 License
This project is open-source and free to use. Built for learning and fun 🎉

Acknowledgments
Spoonacular API-for recipe data
Vercel-for hosting
