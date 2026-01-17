# LMeals: A Self-Hosted Recipe Manager for Home Assistant

LMeals is a beautiful, self-hosted recipe manager with a powerful AI-powered "Smart-Scrape" engine. It's designed to be run as a Home Assistant add-on, allowing you to seamlessly integrate your recipe collection into your smart home.

![LMeals Dashboard](https://i.imgur.com/example.png) <!-- Replace with a real screenshot -->

## Features

*   **Smart-Scrape Engine:** Import recipes from any website. LMeals uses the `recipe-scrapers` library for sites it recognizes, and for everything else, it can use the Groq AI to parse the raw HTML and extract the recipe data.
*   **"Cozy/Pastel" UI:** A beautiful, modern UI with a "Cozy/Pastel" theme, designed to be easy on the eyes and a pleasure to use.
*   **Universal Language Support:** LMeals is designed to work with recipes in any language, with full support for right-to-left (RTL) languages like Hebrew and Arabic.
*   **Meal Planner:** A full-featured, interactive calendar for scheduling your meals.
*   **Shopping List:** Automatically generate a shopping list based on your meal plan for a selected date range.
*   **Favorites:** Mark your favorite recipes for easy access.
*   **Allergen Flagging:** LMeals will visually flag recipes that contain ingredients from your global allergens list.

## For Users: Installing the Home Assistant Add-on

> **Note:** This repository is not yet in the official Home Assistant add-on store. To install it, you will need to add this repository as a custom add-on repository.

1.  **Add the Repository:**
    *   In Home Assistant, navigate to **Settings** > **Add-ons** > **Add-on Store**.
    *   Click the three dots in the top right corner and select **Repositories**.
    *   Paste the URL of this repository and click **Add**.

2.  **Install the Add-on:**
    *   Close the repository manager and you should see "LMeals" appear as a new add-on at the bottom of the page.
    *   Click on **LMeals** and then click **Install**.

3.  **Configure the Add-on:**
    *   After installation is complete, click on the **Configuration** tab.
    *   Enter your Groq API key in the `GROQ_API_KEY` field.
    *   (Optional) Change the Groq model if you'd like.
    *   Click **Save**.

4.  **Start the Add-on:**
    *   Go back to the **Info** tab and click **Start**.
    *   Click **Open Web UI** to access the LMeals interface.

## For Developers: Local Development Setup

If you'd like to contribute to LMeals, you can run the application locally for development.

### Prerequisites

*   Python 3.11+
*   Node.js 18+
*   `npm`

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install the Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the database migrations:**
    ```bash
    alembic upgrade head
    ```

4.  **Set the environment variables:**
    ```bash
    export GROQ_API_KEY="your-groq-api-key"
    export GROQ_MODEL="llama3-70b-8192"
    ```

5.  **Start the backend server:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```

The frontend will be available at `http://localhost:5173`.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
